import pandas as pd
from server.db.database import PostgresConnector
from psycopg2.extras import Json
from server.exceptions import NotAuthorisedException, NonExistentDatasetException

class DatasetManager:
    def __init__(self, db: PostgresConnector):
        self.db = db

    def authorize_user_dataset(self, dataset_id: int, user_id: int) -> bool:
        dataset_info = self.get_dataset_info(dataset_id)

        if dataset_info.get("user_id", None) == None:
            return False

        if dataset_info.get("user_id") != user_id:
            return False
        
        return True
    
    def get_user_datasets(self, user_id: int) -> list[dict]:
        query = "SELECT * FROM datasets WHERE user_id = %s"
        return self.db.execute(query, (user_id, ), fetch=True)

    def get_dataset_content(self, dataset_id: int) -> pd.DataFrame:
        query = "SELECT * FROM events WHERE dataset_id = %s"
        result = self.db.execute(query, (dataset_id,), fetch=True)
        return pd.DataFrame(result)
    
    def get_dataset_info(self, dataset_id: int) -> dict:
        query = "SELECT * FROM datasets WHERE id = %s"
        result = self.db.execute(query, (dataset_id,), fetch=True)

        if not result:
            raise NonExistentDatasetException(f"Dataset {dataset_id} does not exist")

        return result[0]
    
    def save_dataset_info(self, user_id: int, dataset_name: str, topics: dict) -> int:
        query = """
            INSERT INTO datasets (user_id, name, topics)
            VALUES (%s, %s, %s)
            RETURNING id
        """
        result = self.db.execute(query, (user_id, dataset_name, Json(topics)), fetch=True)
        return result[0]["id"] if result else None

    def save_dataset_content(self, dataset_id: int, event_data: pd.DataFrame):
        if event_data.empty:
            return

        query = """
            INSERT INTO events (
                dataset_id,
                post_id,
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
                %s, %s
            )
        """

        values = [
            (
                dataset_id,
                row["id"],
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

    def set_dataset_status(self, dataset_id: int, status: str, status_message: str | None = None):
        if status not in ["processing", "complete", "error"]:
            raise ValueError("Invalid status")

        query = """
            UPDATE datasets
            SET status = %s,
                status_message = %s,
                completed_at = CASE
                    WHEN %s = 'complete' THEN NOW()
                    ELSE NULL
                END
            WHERE id = %s
        """

        self.db.execute(query, (status, status_message, status, dataset_id))

    def get_dataset_status(self, dataset_id: int):
        query = """
            SELECT status, status_message, completed_at
            FROM datasets
            WHERE id = %s
        """

        result = self.db.execute(query, (dataset_id, ), fetch=True)
        
        if not result:
            print(result)
            raise NonExistentDatasetException(f"Dataset {dataset_id} does not exist")
        
        return result[0]
    
    def delete_dataset_info(self, dataset_id: int):
        query = "DELETE FROM datasets WHERE id = %s"

        self.db.execute(query, (dataset_id, ))

    def delete_dataset_content(self, dataset_id: int):
        query = "DELETE FROM events WHERE dataset_id = %s"

        self.db.execute(query, (dataset_id, ))