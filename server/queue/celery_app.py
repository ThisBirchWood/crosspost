from celery import Celery

def create_celery():
    celery = Celery(
        "ethnograph",
        broker="redis://redis:6379/0",
        backend="redis://redis:6379/0",
    )
    celery.conf.task_serializer = "json"
    celery.conf.result_serializer = "json"
    celery.conf.accept_content = ["json"]
    return celery

celery = create_celery()

from server.queue import tasks