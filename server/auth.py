from db.database import PostgresConnector
from flask_bcrypt import Bcrypt

class AuthManager:
    def __init__(self, db: PostgresConnector, bcrypt: Bcrypt):
        self.db = db
        self.bcrypt = bcrypt

    def register_user(self, username, email, password):
        hashed_password = self.bcrypt.generate_password_hash(password).decode("utf-8")

        if self.db.get_user_by_email(email):
            raise ValueError("Email already registered")
        
        if self.db.get_user_by_username(username):
            raise ValueError("Username already taken")

        self.db.save_user(username, email, hashed_password)

    def authenticate_user(self, username, password):
        user = self.db.get_user_by_username(username)
        if user and self.bcrypt.check_password_hash(user['password_hash'], password):
            return user
        return None
    
    def get_user_by_id(self, user_id):
        query = "SELECT id, username, email FROM users WHERE id = %s"
        result = self.db.execute(query, (user_id,), fetch=True)
        return result[0] if result else None