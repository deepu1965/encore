import json
import logging
import os
import subprocess
import tempfile
import time

import boto3
from botocore.config import Config
from kafka import KafkaConsumer
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

KAFKA_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://encore:encore_dev_only@localhost:5432/encore")
MINIO_URL = os.environ.get("MINIO_URL", "http://localhost:9000")
MINIO_USER = os.environ.get("MINIO_ROOT_USER", "minioadmin")
MINIO_PASS = os.environ.get("MINIO_ROOT_PASSWORD", "minioadmin")

def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=MINIO_URL,
        aws_access_key_id=MINIO_USER,
        aws_secret_access_key=MINIO_PASS,
        config=Config(signature_version='s3v4')
    )

def transcode_video(input_path: str, output_path: str, resolution: str):
    logger.info(f"Transcoding to {resolution}...")
    scale = "scale=-2:360" if resolution == "360p" else "scale=-2:720" if resolution == "720p" else "scale=-2:1080"
    
    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-vf", scale,
        "-c:v", "libx264",
        "-preset", "fast",
        "-c:a", "aac",
        output_path
    ]
    
    # We use subprocess.run, it will block until done
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)  # noqa: PLW1510, UP022
    if result.returncode != 0:
        logger.error(f"FFmpeg failed: {result.stderr.decode('utf-8')}")
        raise RuntimeError("FFmpeg transcoding failed")
    logger.info(f"Finished transcoding to {resolution}")

def process_message(msg_value: dict, db_session, s3_client):
    payload = msg_value.get("payload", {})
    media_id = payload.get("media_id")
    media_type = payload.get("media_type")
    s3_bucket = payload.get("s3_bucket")
    s3_key = payload.get("s3_key")
    
    if not all([media_id, s3_bucket, s3_key]) or media_type != "VIDEO":
        logger.info(f"Ignoring non-video or invalid media: {media_id}")
        return

    logger.info(f"Processing video media_id={media_id}")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.mp4")
        
        # 1. Download original
        s3_client.download_file(s3_bucket, s3_key, input_path)
        
        # 2. Transcode & Upload
        resolutions = ["360p", "720p", "1080p"]
        for res in resolutions:
            out_path = os.path.join(tmpdir, f"out_{res}.mp4")
            out_key = f"{s3_key}_{res}.mp4"
            
            try:
                transcode_video(input_path, out_path, res)
                s3_client.upload_file(out_path, s3_bucket, out_key)
                logger.info(f"Uploaded {res} to {s3_bucket}/{out_key}")
            except Exception as e:  # noqa: BLE001
                logger.error(f"Error processing {res}: {e}")
                
        # 3. Update DB to READY
        try:
            db_session.execute(
                "UPDATE media_metadata SET status = 'READY' WHERE id = %s",
                (media_id,)
            )
            db_session.commit()
            logger.info(f"Updated media_metadata status to READY for {media_id}")
        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to update DB: {e}")
            db_session.rollback()

def main():
    logger.info(f"Starting media worker connecting to {KAFKA_SERVERS}")
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    s3_client = get_s3_client()
    
    consumer = KafkaConsumer(
        "media.uploaded",
        bootstrap_servers=KAFKA_SERVERS,
        group_id="media-worker-group",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True
    )
    
    logger.info("Listening for media.uploaded events...")
    for msg in consumer:
        logger.info(f"Received event: {msg.value}")
        try:
            process_message(msg.value, db, s3_client)
        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to process message: {e}")

if __name__ == "__main__":
    while True:
        try:
            main()
        except Exception as e:  # noqa: BLE001
            logger.error(f"Worker crashed: {e}. Restarting in 5s...")
            time.sleep(5)
