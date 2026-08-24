from encore_common import error_envelope, success_envelope


def test_success_envelope_shape():
    result = success_envelope({"id": "evt_1"}, request_id="req_abc")
    assert result == {"data": {"id": "evt_1"}, "request_id": "req_abc"}


def test_error_envelope_shape_defaults_not_retryable():
    result = error_envelope("SEAT_ALREADY_HELD", "Seat is held.", request_id="req_abc")
    assert result["error"]["code"] == "SEAT_ALREADY_HELD"
    assert result["error"]["retryable"] is False
    assert result["request_id"] == "req_abc"


def test_error_envelope_retryable_flag_propagates():
    result = error_envelope("UPSTREAM_TIMEOUT", "Try again.", request_id="req_x", retryable=True)
    assert result["error"]["retryable"] is True
