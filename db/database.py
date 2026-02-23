import os
import psycopg2
from psycopg2.extras import RealDictCursor


class PostgresConnector:
    """
    Simple PostgreSQL connector (single connection).
    """

    def __init__(self):
        self.connection = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=os.getenv("POSTGRES_PORT", 5432),
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "postgres"),
            database=os.getenv("POSTGRES_DB", "postgres"),
        )
        self.connection.autocommit = False

    def execute(self, query, params=None, fetch=False):
        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            if fetch:
                return cursor.fetchall()
            self.connection.commit()

    def executemany(self, query, param_list):
        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.executemany(query, param_list)
            self.connection.commit()

    def save_user(self, username, email, password_hash):
        query = """
            INSERT INTO users (username, email, password_hash)
            VALUES (%s, %s, %s)
        """
        self.execute(query, (username, email, password_hash))

    def get_user_by_username(self, username) -> dict:
        query = "SELECT id, username, email, password_hash FROM users WHERE username = %s"
        result = self.execute(query, (username,), fetch=True)
        return result[0] if result else None
    
    def get_user_by_email(self, email) -> dict:
        query = "SELECT id, username, email, password_hash FROM users WHERE email = %s"
        result = self.execute(query, (email,), fetch=True)
        return result[0] if result else None

    def close(self):
        if self.connection:
            self.connection.close()