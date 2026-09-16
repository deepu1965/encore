import uuid

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from encore_common.envelope import success_envelope
from encore_kafka_client import build_envelope
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import MediaMetadata, MediaStatus, MediaType, MediaVisibility, User

router = APIRouter(prefix="/api/v1/media", tags=["media"])

from ..config import settings  # noqa: E402


# Simple dependency for S3 client
def get_s3_client():
    minio_url = settings.minio_url
    access_key = settings.minio_access_key
    secret_key = settings.minio_secret_key
    
    return boto3.client(
        's3',
        endpoint_url=minio_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4')
    )

class InitUploadRequest(BaseModel):
    filename: str
    media_type: MediaType
    visibility: MediaVisibility = MediaVisibility.PUBLIC
    event_id: uuid.UUID | None = None
    parts_count: int = 1

class InitUploadResponse(BaseModel):
    media_id: uuid.UUID
    upload_id: str
    s3_bucket: str
    s3_key: str
    presigned_urls: list[str]

@router.post("/upload/init", response_model=dict, status_code=status.HTTP_201_CREATED)
def init_upload(
    request: Request,
    req: InitUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    s3=Depends(get_s3_client)
):
    bucket_name = "encore-media" if req.visibility == MediaVisibility.PUBLIC else "encore-docs"
    s3_key = f"{current_user.id}/{uuid.uuid4()}_{req.filename}"
    
    try:
        # Create Multipart upload in MinIO
        response = s3.create_multipart_upload(
            Bucket=bucket_name,
            Key=s3_key,
            ContentType="application/octet-stream"
        )
        upload_id = response['UploadId']
        
        # Generate presigned URLs for each part
        presigned_urls = []
        for part_num in range(1, req.parts_count + 1):
            url = s3.generate_presigned_url(
                ClientMethod='upload_part',
                Params={
                    'Bucket': bucket_name,
                    'Key': s3_key,
                    'UploadId': upload_id,
                    'PartNumber': part_num
                },
                ExpiresIn=3600
            )
            presigned_urls.append(url)
            
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # Create DB record
    media = MediaMetadata(
        id=uuid.uuid4(),
        owner_id=current_user.id,
        event_id=req.event_id,
        filename=req.filename,
        s3_bucket=bucket_name,
        s3_key=s3_key,
        status=MediaStatus.UPLOADING,
        visibility=req.visibility,
        media_type=req.media_type
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    
    return success_envelope(InitUploadResponse(
        media_id=media.id,
        upload_id=upload_id,
        s3_bucket=bucket_name,
        s3_key=s3_key,
        presigned_urls=presigned_urls
    ).model_dump(), request_id=getattr(request.state, "request_id", "auto"))


class PartInfo(BaseModel):
    ETag: str
    PartNumber: int

class CompleteUploadRequest(BaseModel):
    media_id: uuid.UUID
    upload_id: str
    parts: list[PartInfo]

@router.post("/upload/complete", response_model=dict)
def complete_upload(
    request: Request,
    req: CompleteUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    s3=Depends(get_s3_client)
):
    media = db.query(MediaMetadata).filter_by(id=req.media_id, owner_id=current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found or permission denied")
        
    try:
        parts_list = [{'ETag': p.ETag, 'PartNumber': p.PartNumber} for p in req.parts]
        s3.complete_multipart_upload(
            Bucket=media.s3_bucket,
            Key=media.s3_key,
            UploadId=req.upload_id,
            MultipartUpload={'Parts': parts_list}
        )
    except ClientError as e:
        media.status = MediaStatus.FAILED
        db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to complete upload: {str(e)}")
        
    media.status = MediaStatus.PROCESSING if media.media_type == MediaType.VIDEO else MediaStatus.READY  # noqa: E501
    db.commit()
    
    # Emit Kafka event for worker processing
    producer = getattr(request.app.state, "kafka_producer", None)
    if producer is not None:
        envelope = build_envelope(
            event_type="media.uploaded",
            event_version="1.0",
            key=str(media.id),
            payload={
                "media_id": str(media.id),
                "media_type": media.media_type.value,
                "s3_bucket": media.s3_bucket,
                "s3_key": media.s3_key
            },
            producer_name=producer.producer_name,
            trace_id="auto",
        )
        producer.publish("media.uploaded", envelope)
    
    return success_envelope({"media_id": str(media.id), "status": media.status.value}, request_id=getattr(request.state, "request_id", "auto"))  # noqa: E501

@router.get("/{media_id}/url", response_model=dict)
def get_media_url(
    request: Request,
    media_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    s3=Depends(get_s3_client)
):
    media = db.query(MediaMetadata).filter_by(id=media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
        
    if media.visibility == MediaVisibility.ORGANIZER_ONLY:
        if media.owner_id != current_user.id:
            # Note: real RBAC would allow event co-organizers, but for V1 we keep it simple
            raise HTTPException(status_code=403, detail="Forbidden")
            
    try:
        url = s3.generate_presigned_url(
            ClientMethod='get_object',
            Params={
                'Bucket': media.s3_bucket,
                'Key': media.s3_key
            },
            ExpiresIn=3600
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return success_envelope({"media_id": str(media.id), "url": url}, request_id=getattr(request.state, "request_id", "auto"))  # noqa: E501
