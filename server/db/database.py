import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.extras import execute_batch

from server.exceptions import DatabaseNotConfiguredException


class PostgresConnector:
    """
    Simple PostgreSQL connector (single connection).
    """

    def __init__(self):

        try:
            self.connection = psycopg2.connect(
                host=os.getenv("POSTGRES_HOST", "localhost"),
                port=os.getenv("POSTGRES_PORT", 5432),
                user=os.getenv("POSTGRES_USER", "postgres"),
                password=os.getenv("POSTGRES_PASSWORD", "postgres"),
                database=os.getenv("POSTGRES_DB", "postgres"),
            )
        except psycopg2.OperationalError as e:
            raise DatabaseNotConfiguredException(f"Ensure database is up and running: {e}")
        
        self.connection.autocommit = False

    def execute(self, query, params=None, fetch=False) -> list:
        try:
            with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                result = cursor.fetchall() if fetch else None
            self.connection.commit()
            return result
        except Exception:
            self.connection.rollback()
            raise

    def execute_batch(self, query, values):
        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            execute_batch(cursor, query, values)
            self.connection.commit()

    def close(self):
        if self.connection:
            self.connection.close()