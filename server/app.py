import os
import pandas as pd
import traceback
import json

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)

from server.analysis.stat_gen import StatGen
from server.exceptions import NotAuthorisedException, NonExistentDatasetException
from server.db.database import PostgresConnector
from server.core.auth import AuthManager
from server.core.datasets import DatasetManager
from server.utils import get_request_filters, get_env
from server.queue.tasks import process_dataset, fetch_and_process_dataset
from server.connectors.registry import get_available_connectors, get_connector_metadata

app = Flask(__name__)

# Env Variables
load_dotenv()
max_fetch_limit = int(get_env("MAX_FETCH_LIMIT"))
frontend_url = get_env("FRONTEND_URL")
jwt_secret_key = get_env("JWT_SECRET_KEY")
jwt_access_token_expires = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 1200)
)  # Default to 20 minutes

# Flask Configuration
CORS(app, resources={r"/*": {"origins": frontend_url}})
app.config["JWT_SECRET_KEY"] = jwt_secret_key
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = jwt_access_token_expires

# Security
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# Helper Objects
db = PostgresConnector()
auth_manager = AuthManager(db, bcrypt)
dataset_manager = DatasetManager(db)
stat_gen = StatGen()
connectors = get_available_connectors()

# Default Files
with open("server/topics.json") as f:
    default_topic_list = json.load(f)


def normalize_topics(topics):
    if not isinstance(topics, dict) or len(topics) == 0:
        return None

    normalized = {}

    for topic_name, topic_keywords in topics.items():
        if not isinstance(topic_name, str) or not isinstance(topic_keywords, str):
            return None

        clean_name = topic_name.strip()
        clean_keywords = topic_keywords.strip()

        if not clean_name or not clean_keywords:
            return None

        normalized[clean_name] = clean_keywords

    return normalized


@app.route("/register", methods=["POST"])
def register_user():
    data = request.get_json()

    if (
        not data
        or "username" not in data
        or "email" not in data
        or "password" not in data
    ):
        return jsonify({"error": "Missing username, email, or password"}), 400

    username = data["username"]
    email = data["email"]
    password = data["password"]

    try:
        auth_manager.register_user(username, email, password)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred"}), 500

    print(f"Registered new user: {username}")
    return jsonify({"message": f"User '{username}' registered successfully"}), 200


@app.route("/login", methods=["POST"])
def login_user():
    data = request.get_json()

    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "Missing username or password"}), 400

    username = data["username"]
    password = data["password"]

    try:
        user = auth_manager.authenticate_user(username, password)
        if user:
            access_token = create_access_token(identity=str(user["id"]))
            return jsonify({"access_token": access_token}), 200
        else:
            return jsonify({"error": "Invalid username or password"}), 401
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred"}), 500


@app.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    current_user = get_jwt_identity()

    return (
        jsonify(
            message="Access granted", user=auth_manager.get_user_by_id(current_user)
        ),
        200,
    )


@app.route("/user/datasets")
@jwt_required()
def get_user_datasets():
    current_user = int(get_jwt_identity())
    return jsonify(dataset_manager.get_user_datasets(current_user)), 200


@app.route("/datasets/sources", methods=["GET"])
def get_dataset_sources():
    list_metadata = list(get_connector_metadata().values())
    return jsonify(list_metadata)


@app.route("/datasets/fetch", methods=["POST"])
@jwt_required()
def fetch_data():
    data = request.get_json()
    connector_metadata = get_connector_metadata()

    # Strong validation needed, otherwise data goes to Celery and crashes silently
    if not data or "sources" not in data:
        return jsonify({"error": "Sources must be provided"}), 400

    if "name" not in data or not str(data["name"]).strip():
        return jsonify({"error": "Dataset name is required"}), 400

    dataset_name = data["name"].strip()
    user_id = int(get_jwt_identity())
    custom_topics = data.get("topics")
    topics_for_processing = default_topic_list

    source_configs = data["sources"]

    if not isinstance(source_configs, list) or len(source_configs) == 0:
        return jsonify({"error": "Sources must be a non-empty list"}), 400

    for source in source_configs:
        if not isinstance(source, dict):
            return jsonify({"error": "Each source must be an object"}), 400

        if "name" not in source:
            return jsonify({"error": "Each source must contain a name"}), 400

        name = source["name"]
        limit = source.get("limit", 1000)
        category = source.get("category")
        search = source.get("search")

        if limit:
            try:
                limit = int(limit)
            except (ValueError, TypeError):
                return jsonify({"error": "Limit must be an integer"}), 400

            if limit > 1000:
                limit = 1000

        if name not in connector_metadata:
            return jsonify({"error": "Source not supported"}), 400

        if search and not connector_metadata[name]["search_enabled"]:
            return jsonify({"error": f"Source {name} does not support search"}), 400

        if category and not connector_metadata[name]["categories_enabled"]:
            return jsonify({"error": f"Source {name} does not support categories"}), 400

        # if category and not connectors[name]().category_exists(category):
        #     return jsonify({"error": f"Category does not exist for {name}"}), 400

    if custom_topics is not None:
        normalized_topics = normalize_topics(custom_topics)
        if not normalized_topics:
            return (
                jsonify(
                    {
                        "error": "Topics must be a non-empty JSON object with non-empty string keys and values"
                    }
                ),
                400,
            )

        topics_for_processing = normalized_topics

    try:
        dataset_id = dataset_manager.save_dataset_info(
            user_id, dataset_name, topics_for_processing
        )

        dataset_manager.set_dataset_status(
            dataset_id,
            "fetching",
            f"Data is being fetched from {', '.join(source['name'] for source in source_configs)}",
        )

        fetch_and_process_dataset.delay(dataset_id, source_configs, topics_for_processing)
    except Exception:
        print(traceback.format_exc())
        return jsonify({"error": "Failed to queue dataset processing"}), 500

    return (
        jsonify(
            {
                "message": "Dataset queued for processing",
                "dataset_id": dataset_id,
                "status": "processing",
            }
        ),
        202,
    )


@app.route("/datasets/upload", methods=["POST"])
@jwt_required()
def upload_data():
    if "posts" not in request.files or "topics" not in request.files:
        return jsonify({"error": "Missing required files or form data"}), 400

    post_file = request.files["posts"]
    topic_file = request.files["topics"]
    dataset_name = (request.form.get("name") or "").strip()

    if not dataset_name:
        return jsonify({"error": "Missing required dataset name"}), 400

    if post_file.filename == "" or topic_file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    if not post_file.filename.endswith(".jsonl") or not topic_file.filename.endswith(
        ".json"
    ):
        return (
            jsonify(
                {"error": "Invalid file type. Only .jsonl and .json files are allowed."}
            ),
            400,
        )

    try:
        current_user = int(get_jwt_identity())

        posts_df = pd.read_json(post_file, lines=True, convert_dates=False)
        topics = json.load(topic_file)
        dataset_id = dataset_manager.save_dataset_info(
            current_user, dataset_name, topics
        )

        process_dataset.delay(dataset_id, posts_df.to_dict(orient="records"), topics)

        return (
            jsonify(
                {
                    "message": "Dataset queued for processing",
                    "dataset_id": dataset_id,
                    "status": "processing",
                }
            ),
            202,
        )
    except ValueError as e:
        return jsonify({"error": f"Failed to read JSONL file"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred"}), 500


@app.route("/dataset/<int:dataset_id>", methods=["GET"])
@jwt_required()
def get_dataset(dataset_id):
    try:
        user_id = int(get_jwt_identity())

        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        dataset_info = dataset_manager.get_dataset_info(dataset_id)
        included_cols = {"id", "name", "created_at"}

        return jsonify({k: dataset_info[k] for k in included_cols}), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except Exception:
        print(traceback.format_exc())
        return jsonify({"error": "An unexpected error occured"}), 500


@app.route("/dataset/<int:dataset_id>", methods=["PATCH"])
@jwt_required()
def update_dataset(dataset_id):
    try:
        user_id = int(get_jwt_identity())

        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        body = request.get_json()
        new_name = body.get("name")

        if not new_name or not new_name.strip():
            return jsonify({"error": "A valid name must be provided"}), 400

        dataset_manager.update_dataset_name(dataset_id, new_name.strip())
        return (
            jsonify(
                {"message": f"Dataset {dataset_id} renamed to '{new_name.strip()}'"}
            ),
            200,
        )
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except Exception:
        print(traceback.format_exc())
        return jsonify({"error": "An unexpected error occurred"}), 500


@app.route("/dataset/<int:dataset_id>", methods=["DELETE"])
@jwt_required()
def delete_dataset(dataset_id):
    try:
        user_id = int(get_jwt_identity())

        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        dataset_manager.delete_dataset_info(dataset_id)
        dataset_manager.delete_dataset_content(dataset_id)
        return (
            jsonify(
                {
                    "message": f"Dataset {dataset_id} metadata and content successfully deleted"
                }
            ),
            200,
        )
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except Exception:
        print(traceback.format_exc())
        return jsonify({"error": "An unexpected error occured"}), 500


@app.route("/dataset/<int:dataset_id>/status", methods=["GET"])
@jwt_required()
def get_dataset_status(dataset_id):
    try:
        user_id = int(get_jwt_identity())

        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        dataset_status = dataset_manager.get_dataset_status(dataset_id)
        return jsonify(dataset_status), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except Exception:
        print(traceback.format_exc())
        return jsonify({"error": "An unexpected error occured"}), 500


@app.route("/dataset/<int:dataset_id>/linguistic", methods=["GET"])
@jwt_required()
def get_linguistic_analysis(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.linguistic(dataset_content, filters, dataset_id=dataset_id)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred"}), 500


@app.route("/dataset/<int:dataset_id>/emotional", methods=["GET"])
@jwt_required()
def get_emotional_analysis(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.emotional(dataset_content, filters, dataset_id=dataset_id)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred"}), 500


@app.route("/dataset/<int:dataset_id>/summary", methods=["GET"])
@jwt_required()
def get_summary(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.summary(dataset_content, filters, dataset_id=dataset_id)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred"}), 500


@app.route("/dataset/<int:dataset_id>/temporal", methods=["GET"])
@jwt_required()
def get_temporal_analysis(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.temporal(dataset_content, filters, dataset_id=dataset_id)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred"}), 500


@app.route("/dataset/<int:dataset_id>/user", methods=["GET"])
@jwt_required()
def get_user_analysis(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.user(dataset_content, filters, dataset_id=dataset_id)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred"}), 500


@app.route("/dataset/<int:dataset_id>/cultural", methods=["GET"])
@jwt_required()
def get_cultural_analysis(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.cultural(dataset_content, filters, dataset_id=dataset_id)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred"}), 500


@app.route("/dataset/<int:dataset_id>/interactional", methods=["GET"])
@jwt_required()
def get_interaction_analysis(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.interactional(dataset_content, filters, dataset_id=dataset_id)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred"}), 500


@app.route("/dataset/<int:dataset_id>/all", methods=["GET"])
@jwt_required()
def get_full_dataset(dataset_id: int):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException(
                "This user is not authorised to access this dataset"
            )

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.filter_dataset(dataset_content, filters)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred"}), 500


if __name__ == "__main__":
    app.run(debug=True)
