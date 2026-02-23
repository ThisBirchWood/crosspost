import os
import psycopg2


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
        with self.connection.cursor() as cursor:
            cursor.execute(query, params)

            if fetch:
                return cursor.fetchall()

            self.connection.commit()

    def executemany(self, query, param_list):
        with self.connection.cursor() as cursor:
            cursor.executemany(query, param_list)
            self.connection.commit()

    def close(self):
        if self.connection:
            self.connection.close()