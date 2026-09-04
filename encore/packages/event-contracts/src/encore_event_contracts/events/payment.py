from dataclasses import asdict, dataclass

PAYMENT_TOPIC = "payment.events"

PAYMENT_SUCCEEDED_EVENT_TYPE = "payment.succeeded"
PAYMENT_FAILED_EVENT_TYPE = "payment.failed"

PAYMENT_VERSION = "v1"

@dataclass
class PaymentSucceededPayload:
    payment_id: str
    order_id: str
    user_id: str
    amount_cents: int
    succeeded_at: str

    def to_dict(self) -> dict[str, str | int]:
        return asdict(self)

@dataclass
class PaymentFailedPayload:
    payment_id: str
    order_id: str
    user_id: str
    reason: str
    failed_at: str

    def to_dict(self) -> dict[str, str | int]:
        return asdict(self)
