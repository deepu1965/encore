from unittest.mock import MagicMock, patch

from encore_analytics_worker.worker import flush_batch


@patch("encore_analytics_worker.worker.engine")
def test_flush_batch(mock_engine):
    batch = {
        "ad_1": 5,
        "ad_2": 3
    }
    
    mock_conn = MagicMock()
    mock_engine.begin.return_value.__enter__.return_value = mock_conn
    
    flush_batch(batch)
    
    assert mock_conn.execute.call_count == 2
    args_list = mock_conn.execute.call_args_list
    
    # Verify ad_1 insert
    assert "INSERT INTO ad_click_aggregations" in args_list[0][0][0].text
    assert args_list[0][0][1]["ad_id"] == "ad_1"
    assert args_list[0][0][1]["count"] == 5
    
    # Verify ad_2 insert
    assert args_list[1][0][1]["ad_id"] == "ad_2"
    assert args_list[1][0][1]["count"] == 3

@patch("encore_analytics_worker.worker.engine")
def test_flush_empty_batch(mock_engine):
    flush_batch({})
    mock_engine.begin.assert_not_called()
