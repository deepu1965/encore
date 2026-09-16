#!/usr/bin/env python3
import argparse
import logging
import random
import sys
import time

import docker
from docker.errors import APIError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

class ChaosMonkey:
    def __init__(self, targets, interval, duration, mode="pause"):
        self.targets = targets
        self.interval = interval
        self.duration = duration
        self.mode = mode
        try:
            self.client = docker.from_env()
        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to connect to Docker daemon: {e}")
            sys.exit(1)

    def find_container(self, name_part):
        for c in self.client.containers.list():
            if name_part in c.name:
                return c
        return None

    def inject_failure(self, container, duration):
        logger.info(f"Injecting failure ({self.mode}) on {container.name} for {duration} seconds")
        try:
            if self.mode == "pause":
                container.pause()
                time.sleep(duration)
                container.unpause()
            elif self.mode == "stop":
                container.stop(timeout=1)
                time.sleep(duration)
                container.start()
            logger.info(f"Recovered {container.name} from {self.mode}")
        except APIError as e:
            logger.error(f"Docker API error during failure injection: {e}")

    def run(self):
        end_time = time.time() + self.duration
        logger.info(f"Starting chaos monkey on targets {self.targets} for {self.duration}s. Interval: {self.interval}s")
        
        while time.time() < end_time:
            time.sleep(self.interval)
            target = random.choice(self.targets)
            container = self.find_container(target)
            
            if container:
                # Randomize failure duration between 5s and 15s
                failure_duration = random.randint(5, 15)
                self.inject_failure(container, failure_duration)
            else:
                logger.warning(f"Target '{target}' not found in running containers. Skipping this interval.")
                
        logger.info("Chaos monkey test complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Chaos Monkey for Docker Compose")
    parser.add_argument("--targets", nargs="+", default=["redis", "postgres", "payment-service"], help="Target container name substrings to disrupt")
    parser.add_argument("--interval", type=int, default=30, help="Interval between failure injections (seconds)")
    parser.add_argument("--duration", type=int, default=300, help="Total duration of the chaos test (seconds)")
    parser.add_argument("--mode", choices=["pause", "stop"], default="pause", help="Failure mode (pause or stop)")
    
    args = parser.parse_args()
    
    chaos = ChaosMonkey(targets=args.targets, interval=args.interval, duration=args.duration, mode=args.mode)
    chaos.run()
