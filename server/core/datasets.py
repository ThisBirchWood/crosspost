import pandas as pd
from server.db.database import PostgresConnector
from psycopg2.extras import Json
from server.exceptions import NotAuthorisedException

class DatasetManager:
    def __init__(self, db: PostgresConnector):
        self.db = db

    def get_dataset_and_validate(self, dataset_id: int, user_id: int) -> pd.DataFrame:
        dataset_info = self.get_dataset_info(dataset_id)

        if dataset_info.get("user_id") != user_id:
            raise NotAuthorisedException("This user is not authorised to access this dataset")
        
        return self.get_dataset_content(dataset_id)

    def get_dataset_content(self, dataset_id: int) -> pd.DataFrame:
        query = "SELECT * FROM events WHERE dataset_id = %s"
        result = self.db.execute(query, (dataset_id,), fetch=True)
        return pd.DataFrame(result)
    
    def get_dataset_info(self, dataset_id: int) -> dict:
        query = "SELECT * FROM datasets WHERE id = %s"
        result = self.db.execute(query, (dataset_id,), fetch=True)
        return result[0] if result else None
    
    def save_dataset_info(self, user_id: int, dataset_name: str, topics: dict) -> int:
            query = """
                INSERT INTO datasets (user_id, name, topics)
                VALUES (%s, %s, %s)
                RETURNING id
            """
            result = self.db.execute(query, (user_id, dataset_name, Json(topics)), fetch=True)
            return result[0]["id"] if result else None

    def get_dataset_content(self, dataset_id: int) -> pd.DataFrame:
        query = "SELECT * FROM events WHERE dataset_id = %s"
        result = self.db.execute(query, (dataset_id,), fetch=True)
        return pd.DataFrame(result)

    def save_dataset_content(self, dataset_id: int, event_data: pd.DataFrame):
        if event_data.empty:
            return

        query = """
            INSERT INTO events (
                dataset_id,
                type,
                parent_id,
                author,
                title,
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
                %s, %s, %s, %s, %s,
                %s
            )
        """

        values = [
            (
                dataset_id,
                row["type"],
                row["parent_id"],
                row["author"],
                row.get("title"),
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
            )
            for _, row in event_data.iterrows()
        ]

        self.db.execute_batch(query, values)