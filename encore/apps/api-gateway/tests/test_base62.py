from encore_gateway.base62 import encode_base62, decode_base62

def test_base62_encode_decode():
    assert encode_base62(0) == "0"
    assert decode_base62("0") == 0
    
    assert encode_base62(1) == "1"
    assert decode_base62("1") == 1
    
    assert encode_base62(61) == "Z"
    assert decode_base62("Z") == 61
    
    assert encode_base62(62) == "10"
    assert decode_base62("10") == 62
    
    # Large numbers
    num = 123456789
    encoded = encode_base62(num)
    assert decode_base62(encoded) == num
