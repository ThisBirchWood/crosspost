# Generic User Data Transfer Object for social media platforms
class User:
    def __init__(self, username: str, created_utc: int, ):
        self.username = username
        self.created_utc = created_utc

        # Optionals
        self.karma = None