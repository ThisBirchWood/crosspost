import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity
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
jwt_access_token_expires = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 1200)) # Default to 20 minutes

# Flask Configuration
CORS(app, resources={r"/*": {"origins": frontend_url}})
app.config["JWT_SECRET_KEY"] = jwt_secret_key
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = jwt_access_token_expires 

bcrypt = Bcrypt(app)
jwt = JWTManager(app)
auth_manager = AuthManager(db, bcrypt)

# Global State
# posts_df = pd.read_json('small.jsonl', lines=True)
# with open("topic_buckets.json", "r", encoding="utf-8") as f:
#     domain_topics = json.load(f)
# stat_obj = StatGen(posts_df, domain_topics)
stat_obj = None

@app.route('/register', methods=['POST'])
def register_user():
    data = request.get_json()

    if not data or "username" not in data or "email" not in data or "password" not in data: 
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

@app.route('/login', methods=['POST'])
def login_user():
    data = request.get_json()

    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "Missing username or password"}), 400
    
    username = data["username"]
    password = data["password"]

    try:
        user = auth_manager.authenticate_user(username, password)
        if user:
            access_token = create_access_token(identity=str(user['id']))
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
        message="Access granted",
        user=auth_manager.get_user_by_id(current_user)
    ), 200


@app.route('/upload', methods=['POST'])
@jwt_required()
def upload_data():
    if "posts" not in request.files or "topics" not in request.files:
        return jsonify({"error": "Missing required files or form data"}), 400

    post_file = request.files["posts"]
    topic_file = request.files["topics"]

    if post_file.filename == "" or topic_file == "":
        return jsonify({"error": "Empty filename"}), 400

    if not post_file.filename.endswith('.jsonl') or not topic_file.filename.endswith('.json'):
        return jsonify({"error": "Invalid file type. Only .jsonl and .json files are allowed."}), 400
    
    try:
        current_user = get_jwt_identity()

        posts_df = pd.read_json(post_file, lines=True, convert_dates=False)
        topics = json.load(topic_file)
        
        processor = DatasetProcessor(posts_df, topics)
        enriched_df = processor.enrich()
        dataset_id = db.save_dataset_info(current_user, f"dataset_{current_user}", topics)
        db.save_dataset_content(dataset_id, enriched_df)

        return jsonify({"message": "File uploaded successfully", "event_count": len(enriched_df)}), 200
    except ValueError as e:
        return jsonify({"error": f"Failed to read JSONL file: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
@app.route('/dataset/<int:dataset_id>', methods=['GET'])
def get_dataset(dataset_id):
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    return stat_obj.df.to_json(orient="records"), 200, {"Content-Type": "application/json"}

@app.route('/stats/content', methods=['GET'])
def word_frequencies():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    try:
        return jsonify(stat_obj.get_content_analysis()), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
@app.route('/stats/summary', methods=["GET"])
def get_summary():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    try:
        return jsonify(stat_obj.summary()), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
@app.route("/stats/time", methods=["GET"])
def get_time_analysis():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    try:
        return jsonify(stat_obj.get_time_analysis()), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
@app.route("/stats/user", methods=["GET"])
def get_user_analysis():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    try:
        return jsonify(stat_obj.get_user_analysis()), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
@app.route("/stats/cultural", methods=["GET"])
def get_cultural_analysis():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    try:
        return jsonify(stat_obj.get_cultural_analysis()), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route("/stats/interaction", methods=["GET"])
def get_interaction_analysis():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    try:
        return jsonify(stat_obj.get_interactional_analysis()), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route('/filter/query', methods=["POST"])
def filter_query():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400

    data = request.get_json(silent=True) or {}

    if "query" not in data:
        return jsonify(stat_obj.df.to_dict(orient="records")), 200
    
    query = data["query"]
    filtered_df = stat_obj.filter_by_query(query)

    return jsonify(filtered_df), 200

@app.route('/filter/time', methods=["POST"])
def filter_time():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    if "start" not in data or "end" not in data:
        return jsonify({"error": "Please include both start and end dates"}), 400
    
    try:
        start = pd.to_datetime(data["start"], utc=True)
        end = pd.to_datetime(data["end"], utc=True)
        filtered_df = stat_obj.set_time_range(start, end)
        return jsonify(filtered_df), 200
    except Exception:
        return jsonify({"error": "Invalid datetime format"}), 400
    
@app.route('/filter/sources', methods=["POST"])
def filter_sources():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400
    
    if "sources" not in data:
        return jsonify({"error": "Ensure sources hash map is in 'sources' key"}), 400
    
    try:
        filtered_df = stat_obj.filter_data_sources(data["sources"])
        return jsonify(filtered_df), 200
    except ValueError:
        return jsonify({"error": "Please enable at least one data source"}), 400
    except Exception as e:
        return jsonify({"error": "An unexpected server error occured: " + str(e)}), 500
    
    
@app.route('/filter/reset', methods=["GET"])
def reset_dataset():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    try:
        stat_obj.reset_dataset()
        return jsonify({"success": "Dataset successfully reset"})
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    

if __name__ == "__main__":
    app.run(debug=True)