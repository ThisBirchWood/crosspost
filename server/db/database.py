import os
import psycopg2
import os
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor
from psycopg2.extras import execute_batch

load_dotenv()
postgres_host = os.getenv("POSTGRES_HOST", "localhost")
postgres_port = os.getenv("POSTGRES_PORT", 5432)
postgres_user = os.getenv("POSTGRES_USER", "postgres")
postgres_password = os.getenv("POSTGRES_PASSWORD", "postgres")
postgres_db = os.getenv("POSTGRES_DB", "postgres")

from server.exceptions import DatabaseNotConfiguredException


class PostgresConnector:
    """
    Simple PostgreSQL connector (single connection).
    """

    def __init__(self):

        try:
            self.connection = psycopg2.connect(
                host=postgres_host,
                port=postgres_port,
                user=postgres_user,
                password=postgres_password,
                database=postgres_db,
            )
        except psycopg2.OperationalError as e:
            raise DatabaseNotConfiguredException(
                f"Ensure database is up and running: {e}"
            )

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
        try:
            with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                execute_batch(cursor, query, values)
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise

    def close(self):
        if self.connection:
            self.connection.close()
