import pandas as pd

from server.queue.celery_app import celery
from server.analysis.enrichment import DatasetEnrichment
from server.db.database import PostgresConnector
from server.core.datasets import DatasetManager

@celery.task(bind=True, max_retries=3)
def process_dataset(self, dataset_id: int, posts: list, topics: dict):
    db = PostgresConnector()
    dataset_manager = DatasetManager(db)

    try:
        df = pd.DataFrame(posts)

        processor = DatasetEnrichment(df, topics)
        enriched_df = processor.enrich()

        dataset_manager.save_dataset_content(dataset_id, enriched_df)
        dataset_manager.set_dataset_status(dataset_id, "complete", "NLP Processing Completed Successfully")
    except Exception as e:
        dataset_manager.set_dataset_status(dataset_id, "error", f"An error occurred: {e}")