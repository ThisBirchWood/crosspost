from celery import Celery
from dotenv import load_dotenv
from server.utils import get_env

load_dotenv()
REDIS_URL = get_env("REDIS_URL")


def create_celery():
    celery = Celery(
        "ethnograph",
        broker=REDIS_URL,
        backend=REDIS_URL,
    )
    celery.conf.task_serializer = "json"
    celery.conf.result_serializer = "json"
    celery.conf.accept_content = ["json"]
    return celery


celery = create_celery()

from server.queue import tasks
