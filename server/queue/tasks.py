import pandas as pd

from server.queue.celery_app import celery
from server.analysis.enrichment import DatasetEnrichment

@celery.task(bind=True, max_retries=3)
def process_dataset(self, dataset_id: int, posts: list, topics: dict):
    from server.db.database import PostgresConnector
    from server.core.datasets import DatasetManager

    db = PostgresConnector()
    dataset_manager = DatasetManager(db)

    df = pd.DataFrame(posts)

    processor = DatasetEnrichment(df, topics)
    enriched_df = processor.enrich()

    dataset_manager.save_dataset_content(dataset_id, enriched_df)