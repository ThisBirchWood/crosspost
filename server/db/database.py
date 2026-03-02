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

    def executemany(self, query, param_list) -> list:
        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.executemany(query, param_list)
            self.connection.commit()

    ## User Management Methods
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
    
    # Dataset Management Methods
    def save_dataset_info(self, user_id: int, dataset_name: str, topics: dict) -> int:
        query = """
            INSERT INTO datasets (user_id, name, topics)
            VALUES (%s, %s, %s)
            RETURNING id
        """
        result = self.execute(query, (user_id, dataset_name, Json(topics)), fetch=True)
        return result[0]["id"] if result else None

    def save_dataset_content(self, dataset_id: int, event_data: pd.DataFrame):
        query = """
            INSERT INTO events (
                dataset_id,
                type,
                parent_id,
                author,
                content,
                timestamp,
                date,
                dt,
                hour,
                weekday,
                reply_to,
                source,
                topic,
                topic_confidence,
                ner_entities,
                emotion_anger,
                emotion_disgust,
                emotion_fear,
                emotion_joy,
                emotion_sadness
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
        """

        values = []

        for _, row in event_data.iterrows():
            values.append((
                dataset_id,
                row["type"],
                row["parent_id"],
                row["author"],
                row["content"],
                row["timestamp"],
                row["date"],
                row["dt"],
                row["hour"],
                row["weekday"],
                row.get("reply_to"),
                row["source"],
                row.get("topic"),
                row.get("topic_confidence"),
                Json(row["ner_entities"]) if row.get("ner_entities") else None,
                row.get("emotion_anger"),
                row.get("emotion_disgust"),
                row.get("emotion_fear"),
                row.get("emotion_joy"),
                row.get("emotion_sadness"),
            ))

        
        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            execute_batch(cursor, query, values)
            self.connection.commit()

    def get_dataset_content(self, dataset_id: int) -> pd.DataFrame:
        query = "SELECT * FROM events WHERE dataset_id = %s"
        result = self.execute(query, (dataset_id,), fetch=True)
        return pd.DataFrame(result)
    
    def get_dataset_info(self, dataset_id: int) -> dict:
        query = "SELECT * FROM datasets WHERE id = %s"
        result = self.execute(query, (dataset_id,), fetch=True)
        return result[0] if result else None

    def close(self):
        if self.connection:
            self.connection.close()