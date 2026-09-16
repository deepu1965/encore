import contextlib
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from encore_gateway.auth import get_current_user
from encore_gateway.db import SessionWrite, get_db
from encore_gateway.main import app
from encore_gateway.models import MediaMetadata, User


@pytest.fixture(autouse=True)
def override_lifespan():
    original_lifespan = app.router.lifespan_context
    @contextlib.asynccontextmanager
    async def mock_lifespan(*args, **kwargs):
        yield {}
    app.router.lifespan_context = mock_lifespan
    yield
    app.router.lifespan_context = original_lifespan

@pytest.fixture
def client():
    # Setup test client
    with TestClient(app) as c:
        yield c

@pytest.fixture(autouse=True)
def db_session():
    db = SessionWrite()
    app.dependency_overrides[get_db] = lambda: db
    yield db
    db.close()
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def mock_current_user(db_session):
    # Ensure a user exists in the DB to satisfy foreign keys
    user_id = uuid.uuid4()
    user = User(id=user_id, email=f"test_{user_id}@example.com", display_name="Test User")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    
    # Cleanup
    db_session.query(MediaMetadata).filter(MediaMetadata.owner_id == user.id).delete()
    db_session.delete(user)
    db_session.commit()
    app.dependency_overrides.pop(get_current_user, None)

@pytest.fixture
def mock_s3_client():
    with patch("encore_gateway.routers.media.boto3.client") as mock:
        client = MagicMock()
        client.create_multipart_upload.return_value = {"UploadId": "test-upload-id"}
        client.generate_presigned_url.return_value = "http://mock-minio/presigned-url"
        mock.return_value = client
        yield client

def test_init_upload(client: TestClient, mock_current_user: User, mock_s3_client):
    response = client.post(
        "/api/v1/media/upload/init",
        json={
            "filename": "test_video.mp4",
            "media_type": "VIDEO",
            "parts_count": 2
        }
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert "media_id" in data
    assert data["upload_id"] == "test-upload-id"
    assert len(data["presigned_urls"]) == 2
    assert "encore-media" in data["s3_bucket"]

def test_complete_upload(client: TestClient, mock_current_user: User, mock_s3_client):
    # Init first
    init_res = client.post(
        "/api/v1/media/upload/init",
        json={
            "filename": "test_video.mp4",
            "media_type": "VIDEO",
            "parts_count": 1
        }
    )
    data = init_res.json()["data"]
    media_id = data["media_id"]
    upload_id = data["upload_id"]

    # Complete
    response = client.post(
        "/api/v1/media/upload/complete",
        json={
            "media_id": media_id,
            "upload_id": upload_id,
            "parts": [
                {"ETag": "etag123", "PartNumber": 1}
            ]
        }
    )
    assert response.status_code == 200
    res_data = response.json()["data"]
    assert res_data["media_id"] == media_id
    assert res_data["status"] == "PROCESSING"

def test_get_media_url(client: TestClient, mock_current_user: User, mock_s3_client):
    # Init first
    init_res = client.post(
        "/api/v1/media/upload/init",
        json={
            "filename": "test_doc.pdf",
            "media_type": "DOCUMENT",
            "visibility": "PUBLIC",
            "parts_count": 1
        }
    )
    media_id = init_res.json()["data"]["media_id"]

    # Get URL
    response = client.get(
        f"/api/v1/media/{media_id}/url"
    )
    assert response.status_code == 200
    res_data = response.json()["data"]
    assert "url" in res_data
    assert res_data["url"] == "http://mock-minio/presigned-url"
