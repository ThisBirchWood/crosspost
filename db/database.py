# To connect to PostgreSQL database
import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional

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

    def close(self):
        self.connection.close()