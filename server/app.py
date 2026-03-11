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
jwt_access_token_expires = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 1200))  # Default to 20 minutes

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
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

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
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    current_user = get_jwt_identity()

    return jsonify(
        message="Access granted", user=auth_manager.get_user_by_id(current_user)
    ), 200

@app.route("/user/datasets")
@jwt_required()
def get_user_datasets():
    current_user = int(get_jwt_identity())
    return jsonify(dataset_manager.get_user_datasets(current_user)), 200

@app.route("/datasets/sources", methods=["GET"])
def get_dataset_sources():
    return jsonify(get_connector_metadata())

@app.route("/datasets/scrape", methods=["POST"])
@jwt_required()
def scrape_data():
    data = request.get_json()

    if not data or "sources" not in data:
            return jsonify({"error": "Sources must be provided"}), 400
    
    user_id = int(get_jwt_identity())
    dataset_name = data["name"].strip()
    source_configs = data["sources"]

    if not isinstance(source_configs, list) or len(source_configs) == 0:
        return jsonify({"error": "Sources must be a non-empty list"}), 400

    # Light Validation
    for source in source_configs:
        if "name" not in source:
            return jsonify({"error": "Each source must contain a name"}), 400
        if "limit" in source:
            source["limit"] = int(source["limit"])
  
    dataset_id = dataset_manager.save_dataset_info(user_id, dataset_name, default_topic_list)
    dataset_manager.set_dataset_status(
        dataset_id,
        "fetching",
        f"Data is being fetched from {', '.join(source['name'] for source in source_configs)}"
    )
    
    try:
        fetch_and_process_dataset.delay(dataset_id, source_configs, default_topic_list)

        return jsonify(
            {
                "message": "Dataset queued for processing",
                "dataset_id": dataset_id,
                "status": "processing",
            }
        ), 202
    except Exception:
        print(traceback.format_exc())
        return jsonify({"error": "An unexpected error occurred"}), 500

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
        return jsonify(
            {"error": "Invalid file type. Only .jsonl and .json files are allowed."}
        ), 400

    try:
        current_user = int(get_jwt_identity())

        posts_df = pd.read_json(post_file, lines=True, convert_dates=False)
        topics = json.load(topic_file)
        dataset_id = dataset_manager.save_dataset_info(current_user, dataset_name, topics)

        process_dataset.delay(dataset_id, posts_df.to_dict(orient="records"), topics)

        return jsonify(
            {
                "message": "Dataset queued for processing",
                "dataset_id": dataset_id,
                "status": "processing",
            }
        ), 202
    except ValueError as e:
        return jsonify({"error": f"Failed to read JSONL file: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route("/dataset/<int:dataset_id>", methods=["GET"])
@jwt_required()
def get_dataset(dataset_id):
    try:
        user_id = int(get_jwt_identity())

        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException("This user is not authorised to access this dataset")

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
            raise NotAuthorisedException("This user is not authorised to access this dataset")

        body = request.get_json()
        new_name = body.get("name")

        if not new_name or not new_name.strip():
            return jsonify({"error": "A valid name must be provided"}), 400

        dataset_manager.update_dataset_name(dataset_id, new_name.strip())
        return jsonify({"message": f"Dataset {dataset_id} renamed to '{new_name.strip()}'"}), 200
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
            raise NotAuthorisedException("This user is not authorised to access this dataset")

        dataset_manager.delete_dataset_info(dataset_id)
        dataset_manager.delete_dataset_content(dataset_id)
        return jsonify({"message": f"Dataset {dataset_id} metadata and content successfully deleted"}), 200
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
            raise NotAuthorisedException("This user is not authorised to access this dataset")

        dataset_status = dataset_manager.get_dataset_status(dataset_id)
        return jsonify(dataset_status), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except Exception:
        print(traceback.format_exc())
        return jsonify({"error": "An unexpected error occured"}), 500

@app.route("/dataset/<int:dataset_id>/content", methods=["GET"])
@jwt_required()
def content_endpoint(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException("This user is not authorised to access this dataset")

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.get_content_analysis(dataset_content, filters)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/<int:dataset_id>/summary", methods=["GET"])
@jwt_required()
def get_summary(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException("This user is not authorised to access this dataset")

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.summary(dataset_content, filters)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/<int:dataset_id>/time", methods=["GET"])
@jwt_required()
def get_time_analysis(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException("This user is not authorised to access this dataset")

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.get_time_analysis(dataset_content, filters)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/<int:dataset_id>/user", methods=["GET"])
@jwt_required()
def get_user_analysis(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException("This user is not authorised to access this dataset")

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.get_user_analysis(dataset_content, filters)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/<int:dataset_id>/cultural", methods=["GET"])
@jwt_required()
def get_cultural_analysis(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException("This user is not authorised to access this dataset")

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.get_cultural_analysis(dataset_content, filters)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/<int:dataset_id>/interaction", methods=["GET"])
@jwt_required()
def get_interaction_analysis(dataset_id):
    try:
        user_id = int(get_jwt_identity())
        if not dataset_manager.authorize_user_dataset(dataset_id, user_id):
            raise NotAuthorisedException("This user is not authorised to access this dataset")

        dataset_content = dataset_manager.get_dataset_content(dataset_id)
        filters = get_request_filters()
        return jsonify(stat_gen.get_interactional_analysis(dataset_content, filters)), 200
    except NotAuthorisedException:
        return jsonify({"error": "User is not authorised to access this content"}), 403
    except NonExistentDatasetException:
        return jsonify({"error": "Dataset does not exist"}), 404
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True)
