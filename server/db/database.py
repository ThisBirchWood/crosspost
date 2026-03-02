import os
import psycopg2
import pandas as pd
from psycopg2.extras import RealDictCursor
from psycopg2.extras import execute_batch, Json


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

    def execute(self, query, params=None, fetch=False) -> list:
        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            if fetch:
                return cursor.fetchall()
            self.connection.commit()

    def execute_batch(self, query, values):
        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            execute_batch(cursor, query, values)
            self.connection.commit()


    ## User Management Methods
    def close(self):
        if self.connection:
            self.connection.close()