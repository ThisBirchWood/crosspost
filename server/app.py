import os
import datetime

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

from server.stat_gen import StatGen
from server.dataset_processor import DatasetProcessor
from db.database import PostgresConnector
from server.auth import AuthManager

import pandas as pd
import traceback
import json

app = Flask(__name__)
db = PostgresConnector()

# Env Variables
load_dotenv()
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
jwt_secret_key = os.getenv("JWT_SECRET_KEY", "super-secret-change-this")
jwt_access_token_expires = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 1200)
)  # Default to 20 minutes

# Flask Configuration
CORS(app, resources={r"/*": {"origins": frontend_url}})
app.config["JWT_SECRET_KEY"] = jwt_secret_key
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = jwt_access_token_expires

bcrypt = Bcrypt(app)
jwt = JWTManager(app)
auth_manager = AuthManager(db, bcrypt)

stat_gen = StatGen()

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


@app.route("/upload", methods=["POST"])
@jwt_required()
def upload_data():
    if "posts" not in request.files or "topics" not in request.files:
        return jsonify({"error": "Missing required files or form data"}), 400

    post_file = request.files["posts"]
    topic_file = request.files["topics"]

    if post_file.filename == "" or topic_file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    if not post_file.filename.endswith(".jsonl") or not topic_file.filename.endswith(
        ".json"
    ):
        return jsonify(
            {"error": "Invalid file type. Only .jsonl and .json files are allowed."}
        ), 400

    try:
        current_user = get_jwt_identity()

        posts_df = pd.read_json(post_file, lines=True, convert_dates=False)
        topics = json.load(topic_file)

        processor = DatasetProcessor(posts_df, topics)
        enriched_df = processor.enrich()
        dataset_id = db.save_dataset_info(
            current_user, f"dataset_{current_user}", topics
        )
        db.save_dataset_content(dataset_id, enriched_df)

        return jsonify(
            {"message": "File uploaded successfully", "event_count": len(enriched_df), "dataset_id": dataset_id}
        ), 200
    except ValueError as e:
        return jsonify({"error": f"Failed to read JSONL file: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/<int:dataset_id>", methods=["GET"])
@jwt_required()
def get_dataset(dataset_id):
    current_user = get_jwt_identity()
    dataset = db.get_dataset_info(dataset_id)

    if dataset.get("user_id") != int(current_user):
        return jsonify({"error": "Unauthorized access to dataset"}), 403

    dataset_content = db.get_dataset_content(dataset_id)

    if dataset_content.empty:
        return jsonify({"error": "Dataset content not found"}), 404

    return jsonify(dataset_content.to_dict(orient="records")), 200


@app.route("/dataset/<int:dataset_id>/content", methods=["GET"])
@jwt_required()
def content_endpoint(dataset_id):
    current_user = get_jwt_identity()
    dataset = db.get_dataset_info(dataset_id)

    if dataset.get("user_id") != int(current_user):
        return jsonify({"error": "Unauthorized access to dataset"}), 403

    dataset_content = db.get_dataset_content(dataset_id)
    try:
        return jsonify(stat_gen.get_content_analysis(dataset_content)), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/<int:dataset_id>/summary", methods=["GET"])
@jwt_required()
def get_summary(dataset_id):
    current_user = get_jwt_identity()
    dataset = db.get_dataset_info(dataset_id)

    if dataset.get("user_id") != int(current_user):
        return jsonify({"error": "Unauthorized access to dataset"}), 403

    dataset_content = db.get_dataset_content(dataset_id)

    try:
        return jsonify(stat_gen.summary(dataset_content)), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/<int:dataset_id>/time", methods=["GET"])
@jwt_required()
def get_time_analysis(dataset_id):
    current_user = get_jwt_identity()
    dataset = db.get_dataset_info(dataset_id)

    if dataset.get("user_id") != int(current_user):
        return jsonify({"error": "Unauthorized access to dataset"}), 403

    dataset_content = db.get_dataset_content(dataset_id)

    try:
        return jsonify(stat_gen.get_time_analysis(dataset_content)), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/<int:dataset_id>/user", methods=["GET"])
@jwt_required()
def get_user_analysis(dataset_id):
    current_user = get_jwt_identity()
    dataset = db.get_dataset_info(dataset_id)

    if dataset.get("user_id") != int(current_user):
        return jsonify({"error": "Unauthorized access to dataset"}), 403

    dataset_content = db.get_dataset_content(dataset_id)

    try:
        return jsonify(stat_gen.get_user_analysis(dataset_content)), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/<int:dataset_id>/cultural", methods=["GET"])
@jwt_required()
def get_cultural_analysis(dataset_id):
    current_user = get_jwt_identity()
    dataset = db.get_dataset_info(dataset_id)

    if dataset.get("user_id") != int(current_user):
        return jsonify({"error": "Unauthorized access to dataset"}), 403

    dataset_content = db.get_dataset_content(dataset_id)

    try:
        return jsonify(stat_gen.get_cultural_analysis(dataset_content)), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/<int:dataset_id>/interaction", methods=["GET"])
@jwt_required()
def get_interaction_analysis(dataset_id):
    current_user = get_jwt_identity()
    dataset = db.get_dataset_info(dataset_id)

    if dataset.get("user_id") != int(current_user):
        return jsonify({"error": "Unauthorized access to dataset"}), 403

    dataset_content = db.get_dataset_content(dataset_id)

    try:
        return jsonify(stat_gen.get_interactional_analysis(dataset_content)), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/dataset/query", methods=["POST"])
@jwt_required()
def filter_query():
    data = request.get_json()

    if "query" in data:
        stat_gen.set_search_query(data["query"])

    if "start" in data:
        start_timestamp = datetime.datetime.fromisoformat(data["start"])
        stat_gen.set_start_date(start_timestamp)

    if "end" in data:
        end_timestamp = datetime.datetime.fromisoformat(data["end"])
        stat_gen.set_end_date(end_timestamp)

    if "sources" in data:
        data_sources = set(data["sources"])
        stat_gen.set_data_sources(data_sources)

    return jsonify({"message": "Filters set successfully"}), 200


@app.route("/database/query/reset", methods=["GET"])
@jwt_required()
def reset_dataset():
    stat_gen.reset_filters()
    return jsonify({"message": "Filters reset successfully"}), 200


if __name__ == "__main__":
    app.run(debug=True)
