from db.database import PostgresConnector

class AuthManager:
    def __init__(self, db: PostgresConnector, bcrypt):
        self.db = db
        self.bcrypt = bcrypt

    def register_user(self, username, password):
        # Hash the password
        hashed_password = self.bcrypt.generate_password_hash(password).decode("utf-8")
        # Save the user to the database
        self.db.save_user(username, hashed_password)