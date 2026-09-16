"""Unit tests for encore_cache.ConsistentHashRing.

Tests cover all the invariants described in the module docstring:
  - deterministic mapping (same key → same node)
  - empty ring returns None
  - single-node ring routes everything to that node
  - distribution is reasonably uniform across nodes
  - virtual node count affects distribution quality
  - node addition: keys not in the new node's range are stable
  - node removal: only ~1/N keys remap (bounded remapping guarantee)
  - idempotent add/remove

These tests have no external dependencies (no Redis, no fakeredis). They
run anywhere Python 3.11+ is available, including the sandboxed CI env.
"""


from encore_cache.consistent_hashing import ConsistentHashRing

# ---------------------------------------------------------------------------
# Basic correctness
# ---------------------------------------------------------------------------


def test_empty_ring_returns_none():
    ring = ConsistentHashRing()
    assert ring.get_node("event:742") is None


def test_single_node_all_keys_map_to_it():
    ring = ConsistentHashRing(nodes=["redis-0"])
    for key in ["event:1", "event:2", "session:abc", "ratelimit:x"]:
        assert ring.get_node(key) == "redis-0"


def test_deterministic_mapping():
    """Same ring + same key → same node, always."""
    ring = ConsistentHashRing(nodes=["redis-0", "redis-1", "redis-2"])
    key = "event:742:seats"
    first = ring.get_node(key)
    for _ in range(100):
        assert ring.get_node(key) == first, "mapping is non-deterministic"


def test_different_keys_can_map_to_different_nodes():
    """With 3 nodes and enough keys, at least 2 nodes should be used."""
    ring = ConsistentHashRing(nodes=["redis-0", "redis-1", "redis-2"])
    keys = [f"event:{i}" for i in range(300)]
    nodes_used = {ring.get_node(k) for k in keys}
    assert len(nodes_used) > 1, "all keys mapped to same node — hash is not distributing"


def test_nodes_property_reflects_current_state():
    ring = ConsistentHashRing(nodes=["redis-0", "redis-1"])
    assert ring.nodes == frozenset({"redis-0", "redis-1"})
    ring.add_node("redis-2")
    assert "redis-2" in ring.nodes
    ring.remove_node("redis-1")
    assert "redis-1" not in ring.nodes


# ---------------------------------------------------------------------------
# Distribution
# ---------------------------------------------------------------------------


def test_distribution_is_reasonably_uniform():
    """With 150 vnodes (default), coefficient of variation should be < 20%
    for a large key set.  CV = stddev / mean.
    """
    import math

    nodes = ["redis-0", "redis-1", "redis-2", "redis-3"]
    ring = ConsistentHashRing(nodes=nodes, vnodes_per_node=150)
    keys = [f"key:{i}" for i in range(10_000)]
    dist = ring.distribution(keys)

    counts = list(dist.values())
    mean = sum(counts) / len(counts)
    variance = sum((c - mean) ** 2 for c in counts) / len(counts)
    cv = math.sqrt(variance) / mean  # coefficient of variation
    assert cv < 0.20, f"distribution CV too high: {cv:.3f} (want < 0.20)"


def test_more_vnodes_improves_distribution():
    """Higher vnodes_per_node should reduce the max/min ratio."""
    nodes = ["redis-0", "redis-1", "redis-2"]
    keys = [f"key:{i}" for i in range(5_000)]

    ring_low = ConsistentHashRing(nodes=nodes, vnodes_per_node=10)
    ring_high = ConsistentHashRing(nodes=nodes, vnodes_per_node=200)

    def spread(ring):
        dist = ring.distribution(keys)
        counts = list(dist.values())
        return max(counts) / min(counts) if min(counts) > 0 else float("inf")

    assert spread(ring_high) < spread(ring_low), "more vnodes should give better distribution"


# ---------------------------------------------------------------------------
# Node addition (key stability)
# ---------------------------------------------------------------------------


def test_adding_node_is_idempotent():
    ring = ConsistentHashRing(nodes=["redis-0"])
    ring.add_node("redis-0")  # second add is no-op
    assert ring.nodes == frozenset({"redis-0"})


def test_adding_node_only_remaps_some_keys():
    """When we add a node to a 3-node ring, most keys should stay stable."""
    nodes_before = ["redis-0", "redis-1", "redis-2"]
    ring = ConsistentHashRing(nodes=nodes_before)
    keys = [f"event:{i}:seats" for i in range(1_000)]

    before = {k: ring.get_node(k) for k in keys}

    ring.add_node("redis-3")  # adds a 4th node

    after = {k: ring.get_node(k) for k in keys}
    changed = sum(1 for k in keys if before[k] != after[k])

    # Expected ~25% remapping for a 4-node ring from 3.
    # Allow generous upper bound (50%) to avoid flakiness from small key set.
    assert changed < len(keys) * 0.50, (
        f"too many keys remapped on add: {changed}/{len(keys)}"
    )
    # At least some keys should have remapped (otherwise the new node is empty).
    assert changed > 0, "new node received no keys"


# ---------------------------------------------------------------------------
# Node removal (bounded remapping)
# ---------------------------------------------------------------------------


def test_removing_node_is_idempotent():
    ring = ConsistentHashRing(nodes=["redis-0", "redis-1"])
    ring.remove_node("redis-2")  # not in ring — no-op
    assert ring.nodes == frozenset({"redis-0", "redis-1"})


def test_removing_node_only_remaps_its_share_of_keys():
    """With N nodes, removing one should remap approximately 1/N of keys.

    With 3 nodes, expect ~33% remapping.
    We allow [10%, 60%] to avoid test flakiness with small key counts.
    """
    nodes = ["redis-0", "redis-1", "redis-2"]
    ring = ConsistentHashRing(nodes=nodes)
    keys = [f"key:{i}" for i in range(3_000)]

    changed = ring.remapping_count(keys, removed_node="redis-1")
    fraction = changed / len(keys)

    assert 0.10 < fraction < 0.60, (
        f"remapping fraction {fraction:.3f} outside expected range [0.10, 0.60]"
    )


def test_removing_all_nodes_returns_none_for_every_key():
    ring = ConsistentHashRing(nodes=["redis-0", "redis-1"])
    ring.remove_node("redis-0")
    ring.remove_node("redis-1")
    assert ring.get_node("anything") is None


# ---------------------------------------------------------------------------
# Hash function properties
# ---------------------------------------------------------------------------


def test_hash_is_deterministic():
    h1 = ConsistentHashRing._hash("event:742")
    h2 = ConsistentHashRing._hash("event:742")
    assert h1 == h2


def test_hash_is_an_unsigned_int():
    h = ConsistentHashRing._hash("anything")
    assert isinstance(h, int)
    assert h >= 0


def test_different_keys_have_different_hashes():
    """Minimal collision check for the keys we actually use."""
    keys = [f"event:{i}" for i in range(100)] + [f"session:{i}" for i in range(100)]
    hashes = [ConsistentHashRing._hash(k) for k in keys]
    # Allow at most 1 collision in 200 keys (SHA-256 truncated to 32 bits
    # has ~2^32 values; birthday-paradox collision probability for 200 inputs
    # is negligibly small in practice).
    assert len(set(hashes)) >= len(hashes) - 1


# ---------------------------------------------------------------------------
# Distribution helper
# ---------------------------------------------------------------------------


def test_distribution_sums_to_total_key_count():
    ring = ConsistentHashRing(nodes=["redis-0", "redis-1"])
    keys = [f"k:{i}" for i in range(100)]
    dist = ring.distribution(keys)
    assert sum(dist.values()) == len(keys)


def test_distribution_returns_empty_dict_for_empty_ring():
    ring = ConsistentHashRing()
    dist = ring.distribution(["k:1", "k:2"])
    assert dist == {}
