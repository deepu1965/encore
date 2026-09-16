import os
import sys

sys.path.insert(0, os.path.abspath('src'))
from encore_payment_service.db import engine
from encore_payment_service.models import Base

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("Payment DB initialized.")
