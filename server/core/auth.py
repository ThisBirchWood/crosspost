import re

from server.db.database import PostgresConnector
from flask_bcrypt import Bcrypt

EMAIL_REGEX = re.compile(r"[^@]+@[^@]+\.[^@]+")

class AuthManager:
    def __init__(self, db: PostgresConnector, bcrypt: Bcrypt):
        self.db = db
        self.bcrypt = bcrypt

    # private
    def _save_user(self, username, email, password_hash):
        query = """
            INSERT INTO users (username, email, password_hash)
            VALUES (%s, %s, %s)
        """
        self.db.execute(query, (username, email, password_hash))

    # public
    def register_user(self, username, email, password):
        hashed_password = self.bcrypt.generate_password_hash(password).decode("utf-8")

        if len(username) < 3:
            raise ValueError("Username must be longer than 3 characters")
        
        if not EMAIL_REGEX.match(email):
            raise ValueError("Please enter a valid email address")

        if self.get_user_by_email(email):
            raise ValueError("Email already registered")
        
        if self.get_user_by_username(username):
            raise ValueError("Username already taken")

        self._save_user(username, email, hashed_password)

    def authenticate_user(self, username, password):
        user = self.get_user_by_username(username)
        if user and self.bcrypt.check_password_hash(user['password_hash'], password):
            return user
        return None
    
    def get_user_by_id(self, user_id):
        query = "SELECT id, username, email FROM users WHERE id = %s"
        result = self.db.execute(query, (user_id,), fetch=True)
        return result[0] if result else None
    
    def get_user_by_username(self, username) -> dict:
        query = "SELECT id, username, email, password_hash FROM users WHERE username = %s"
        result = self.db.execute(query, (username,), fetch=True)
        return result[0] if result else None
    
    def get_user_by_email(self, email) -> dict:
        query = "SELECT id, username, email, password_hash FROM users WHERE email = %s"
        result = self.db.execute(query, (email,), fetch=True)
        return result[0] if result else None
