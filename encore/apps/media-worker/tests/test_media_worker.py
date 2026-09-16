from unittest.mock import MagicMock, patch

from encore_media_worker.worker import process_message


@patch("encore_media_worker.worker.transcode_video")
def test_process_message_video(mock_transcode):
    # Setup
    s3_client = MagicMock()
    db_session = MagicMock()
    
    msg_value = {
        "payload": {
            "media_id": "test_media_123",
            "media_type": "VIDEO",
            "s3_bucket": "encore-media",
            "s3_key": "raw/test_media_123.mp4"
        }
    }
    
    # Execute
    process_message(msg_value, db_session, s3_client)
    
    # Verify download
    s3_client.download_file.assert_called_once()
    assert s3_client.download_file.call_args[0][0] == "encore-media"
    assert s3_client.download_file.call_args[0][1] == "raw/test_media_123.mp4"
    
    # Verify transcode
    assert mock_transcode.call_count == 3
    
    # Verify upload (3 times for 3 resolutions)
    assert s3_client.upload_file.call_count == 3
    
    # Verify DB update
    db_session.execute.assert_called_once()
    assert "UPDATE media_metadata" in db_session.execute.call_args[0][0]
    db_session.commit.assert_called_once()

def test_process_message_non_video():
    s3_client = MagicMock()
    db_session = MagicMock()
    
    msg_value = {
        "payload": {
            "media_id": "test_media_123",
            "media_type": "IMAGE",
            "s3_bucket": "encore-media",
            "s3_key": "raw/test_media_123.jpg"
        }
    }
    
    process_message(msg_value, db_session, s3_client)
    
    # Verify ignored
    s3_client.download_file.assert_not_called()
    db_session.execute.assert_not_called()
