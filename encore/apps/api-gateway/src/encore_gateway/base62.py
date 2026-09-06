BASE62_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
BASE = len(BASE62_ALPHABET)

def encode_base62(num: int) -> str:
    """Encode an integer into a Base62 string."""
    if num == 0:
        return BASE62_ALPHABET[0]
    
    encoded = []
    while num > 0:
        num, rem = divmod(num, BASE)
        encoded.append(BASE62_ALPHABET[rem])
        
    return "".join(reversed(encoded))

def decode_base62(string: str) -> int:
    """Decode a Base62 string into an integer."""
    num = 0
    for char in string:
        num = num * BASE + BASE62_ALPHABET.index(char)
    return num
