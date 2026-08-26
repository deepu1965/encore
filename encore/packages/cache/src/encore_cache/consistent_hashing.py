"""Consistent hashing with virtual nodes.

WHY CONSISTENT HASHING?
────────────────────────
Standard modular hashing (hash(key) % N) is simple but fragile: adding or
removing one node remaps ~N/(N+1) of all keys — in a cluster of 10 nodes,
that's ~90% remapping, causing a "cache stampede" where suddenly all those
keys must be re-fetched from the DB simultaneously.

Consistent hashing solves this: when a node is added or removed, only
~1/N of keys change their mapping. In a 10-node cluster, that's ~10%.

WHY VIRTUAL NODES?
──────────────────
With only one point per physical node on the ring, the distribution can be
severely uneven — especially with a small number of nodes (3–5 is typical
locally). Virtual nodes (vnodes) place K points per physical node, spread
uniformly around the ring, making the distribution of keys proportional
to K even at small cluster sizes.

Good values for K: 100–200. At 150 vnodes per node, distribution
experiments show <10% coefficient of variation across nodes.

IMPLEMENTATION:
───────────────
The ring is a sorted list of (hash_value, node_name) pairs. Lookup performs
a binary search (bisect_left) to find the first point ≥ hash(key), wrapping
around to the first point if past the end. This is O(log V) per lookup where
V = total virtual nodes = N * vnodes_per_node.

The hash function is SHA-256 truncated to a 32-bit unsigned int. SHA-256 is
more uniform than MD5 or CRC32 and is available in the stdlib without any
additional dependency.

USAGE:
──────
    ring = ConsistentHashRing(nodes=["redis-0", "redis-1", "redis-2"])
    node = ring.get_node("event:742")      # → "redis-1" (deterministic)
    ring.add_node("redis-3")
    ring.remove_node("redis-1")

KEY DESIGN NOTE:
────────────────
In Week 3, consistent hashing is implemented as a standalone, framework-free
abstraction. The api-gateway uses it to route keys to logical Redis shards
when multiple Redis nodes are configured. In the single-node local dev
environment there is exactly one node, so every key maps to the same node
— which is correct and verifiable. Multi-node support becomes relevant in
Week 16-17 (Scaling/Sharding).

TRADEOFFS:
──────────
Benefit: O(1/N) key remapping on topology change vs. O(N/N+1) for modular
Cost: extra memory for the ring (V pairs); extra O(log V) lookup overhead
      vs. O(1) modular; slightly more complex code path.
"""

from __future__ import annotations

import bisect
import hashlib
from collections import Counter


class ConsistentHashRing:
    """Hash ring with virtual nodes for key → node mapping.

    Thread-safety: not thread-safe. If nodes are added/removed from multiple
    threads, external locking is required. In Week 3, topology changes happen
    only at startup, so this is fine.

    Attributes:
        vnodes_per_node: Number of virtual ring points per physical node.
                         Higher values = more even distribution. 150 is a
                         reasonable default. See module docstring.
    """

    DEFAULT_VNODES = 150

    def __init__(
        self,
        nodes: list[str] | None = None,
        vnodes_per_node: int = DEFAULT_VNODES,
    ) -> None:
        self._vnodes_per_node = vnodes_per_node
        # The ring is a sorted list of (ring_position: int, node_name: str).
        # Kept sorted by ring_position to allow bisect lookups.
        self._ring: list[tuple[int, str]] = []
        self._nodes: set[str] = set()

        for node in nodes or []:
            self.add_node(node)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def nodes(self) -> frozenset[str]:
        """Snapshot of current physical nodes."""
        return frozenset(self._nodes)

    def add_node(self, node: str) -> None:
        """Add a physical node to the ring.

        Idempotent: adding a node that already exists is a no-op.
        Only ~1/N of existing keys will remap to the new node.
        """
        if node in self._nodes:
            return
        self._nodes.add(node)
        for i in range(self._vnodes_per_node):
            vnode_key = f"{node}#{i}"
            pos = self._hash(vnode_key)
            bisect.insort(self._ring, (pos, f"{node}#{i}"))

    def remove_node(self, node: str) -> None:
        """Remove a physical node from the ring.

        Idempotent: removing a node that doesn't exist is a no-op.
        Only ~1/N of keys (those that were mapped to this node) will remap.
        """
        if node not in self._nodes:
            return
        self._nodes.discard(node)
        self._ring = [
            (pos, vnode_label)
            for pos, vnode_label in self._ring
            if not vnode_label.startswith(f"{node}#")
        ]

    def get_node(self, key: str) -> str | None:
        """Map a key to a physical node.

        Returns None if the ring is empty (no nodes configured).
        The mapping is deterministic: same key + same ring topology → same node.
        """
        if not self._ring:
            return None
        pos = self._hash(key)
        idx = bisect.bisect_left(self._ring, (pos, ""))
        if idx >= len(self._ring):
            idx = 0  # wrap around
        _, vnode_label = self._ring[idx]
        # Strip the "#<vnode_index>" suffix to get the physical node name.
        physical_node, _ = vnode_label.rsplit("#", 1)
        return physical_node

    def distribution(self, keys: list[str]) -> dict[str, int]:
        """Count how many of the given keys map to each physical node.

        Useful for verifying distribution uniformity in tests and benchmarks.
        Returns a dict: {node_name: key_count}.
        """
        counts: Counter[str] = Counter()
        for key in keys:
            node = self.get_node(key)
            if node is not None:
                counts[node] += 1
        return dict(counts)

    def remapping_count(self, keys: list[str], removed_node: str) -> int:
        """Simulate removing removed_node and count how many keys would remap.

        Does NOT mutate the ring. Returns the number of keys that would move
        to a different node if removed_node were taken out of the ring.

        Used in tests to verify the ~1/N remapping guarantee.
        """
        before = {key: self.get_node(key) for key in keys}

        # Temporarily remove the node and record new assignments.
        self._nodes.discard(removed_node)
        old_ring = self._ring[:]
        self._ring = [
            (pos, label)
            for pos, label in self._ring
            if not label.startswith(f"{removed_node}#")
        ]

        after = {key: self.get_node(key) for key in keys}

        # Restore original ring.
        self._ring = old_ring
        self._nodes.add(removed_node)

        return sum(1 for key in keys if before[key] != after[key])

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    @staticmethod
    def _hash(value: str) -> int:
        """SHA-256 → first 4 bytes → unsigned 32-bit int.

        Using the first 4 bytes of SHA-256 gives a 32-bit integer space
        (0 .. 2^32-1), which is more than enough for ring positions and
        avoids the signedness ambiguity of Python's built-in hash().
        """
        digest = hashlib.sha256(value.encode()).digest()
        return int.from_bytes(digest[:4], byteorder="big")
