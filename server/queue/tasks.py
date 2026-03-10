import pandas as pd

from server.queue.celery_app import celery
from server.analysis.enrichment import DatasetEnrichment
from server.db.database import PostgresConnector
from server.core.datasets import DatasetManager
from server.connectors.registry import get_available_connectors

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

@celery.task(bind=True, max_retries=3)
def fetch_and_process_dataset(self, 
                              dataset_id: int, 
                              per_source: dict[str, int], 
                              search: str, 
                              category: str, 
                              topics: dict):
    connectors = get_available_connectors()
    db = PostgresConnector()
    dataset_manager = DatasetManager(db)
    posts = []

    try:
        for source_name, source_limit in per_source.items():
            connector = connectors[source_name]()
            posts.extend(connector.get_new_posts_by_search(
                search=search,
                category=category,
                post_limit=source_limit,
                comment_limit=source_limit
            ))

        process_dataset.delay(dataset_id, [p.to_dict() for p in posts], topics)
    except Exception as e:
        dataset_manager.set_dataset_status(dataset_id, "error", f"An error occurred: {e}")