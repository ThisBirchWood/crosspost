# To connect to PostgreSQL database
import psycopg2

from psycopg2.extras import RealDictCursor
from typing import Optional

class Database:
    def __init__(self, db_name: str, user: str, password: str, host: str = 'localhost', port: int = 5432):
        self.connection = psycopg2.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )
        self.connection.autocommit = True

    def execute_query(self, query: str, params: Optional[tuple] = None):
        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            if cursor.description:
                return cursor.fetchall()
            return []
        
    def execute_many(self, query: str, params_list: list[tuple]):
        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.executemany(query, params_list)

    def close(self):
        self.connection.close()
        print("Database connection closed.")

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()