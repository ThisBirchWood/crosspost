import datetime
import pandas as pd

from flask import request
from flask_jwt_extended import get_jwt_identity
from db.database import PostgresConnector
from server.exceptions import NotAuthorisedException

def parse_datetime_filter(value):
    if not value:
        return None

    try:
        return datetime.datetime.fromisoformat(value)
    except ValueError:
        try:
            return datetime.datetime.fromtimestamp(float(value))
        except ValueError as err:
            raise ValueError(
                "Date filters must be ISO-8601 strings or Unix timestamps"
            ) from err


def get_request_filters() -> dict:
    filters = {}

    search_query = request.args.get("search_query") or request.args.get("query")
    if search_query:
        filters["search_query"] = search_query

    start_date = parse_datetime_filter(
        request.args.get("start_date") or request.args.get("start")
    )
    if start_date:
        filters["start_date"] = start_date

    end_date = parse_datetime_filter(
        request.args.get("end_date") or request.args.get("end")
    )
    if end_date:
        filters["end_date"] = end_date

    data_sources = request.args.getlist("data_sources")
    if not data_sources:
        data_sources = request.args.getlist("sources")

    if len(data_sources) == 1 and "," in data_sources[0]:
        data_sources = [
            source.strip() for source in data_sources[0].split(",") if source.strip()
        ]

    if data_sources:
        filters["data_sources"] = data_sources

    return filters

def get_dataset_and_validate(dataset_id: int, db: PostgresConnector) -> pd.DataFrame:
    current_user = get_jwt_identity()
    dataset = db.get_dataset_info(dataset_id)

    if dataset.get("user_id") != int(current_user):
        raise NotAuthorisedException("This user is not authorised to access this dataset")
    
    return db.get_dataset_content(dataset_id)
