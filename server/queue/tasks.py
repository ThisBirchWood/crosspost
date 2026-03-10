import pandas as pd
import logging

from server.queue.celery_app import celery
from server.analysis.enrichment import DatasetEnrichment
from server.db.database import PostgresConnector
from server.core.datasets import DatasetManager
from server.connectors.registry import get_available_connectors

logger = logging.getLogger(__name__)

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
                              source_info: list[dict],
                              topics: dict):
    connectors = get_available_connectors()
    db = PostgresConnector()
    dataset_manager = DatasetManager(db)
    posts = []

    try:
        for metadata in source_info:
            name = metadata["name"]
            search = metadata.get("search")
            category = metadata.get("category")
            limit = metadata.get("limit", 100)

            connector = connectors[name]()
            raw_posts = connector.get_new_posts_by_search(
                search=search,
                category=category,
                post_limit=limit,
                comment_limit=limit
            )
            posts.extend(post.to_dict() for post in raw_posts)

        df = pd.DataFrame(posts)

        processor = DatasetEnrichment(df, topics)
        enriched_df = processor.enrich()

        dataset_manager.save_dataset_content(dataset_id, enriched_df)
        dataset_manager.set_dataset_status(dataset_id, "complete", "NLP Processing Completed Successfully")
    except Exception as e:
        dataset_manager.set_dataset_status(dataset_id, "error", f"An error occurred: {e}")