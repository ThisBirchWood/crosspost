from flask import Flask, jsonify, request
from flask_cors import CORS
from server.stat_gen import StatGen

import pandas as pd
import traceback
import json

app = Flask(__name__)

# Allow for CORS from localhost:5173
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Global State
posts_df = pd.read_json('small.jsonl', lines=True)
with open("topic_buckets.json", "r", encoding="utf-8") as f:
    domain_topics = json.load(f)
stat_obj = StatGen(posts_df, domain_topics)

@app.route('/upload', methods=['POST'])
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
        global stat_obj

        posts_df = pd.read_json(post_file, lines=True)
        stat_obj = StatGen(posts_df, json.load(topic_file))
        return jsonify({"message": "File uploaded successfully", "event_count": len(stat_obj.df)}), 200
    except ValueError as e:
        return jsonify({"error": f"Failed to read JSONL file: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
@app.route('/dataset', methods=['GET'])
def get_dataset():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    return stat_obj.df.to_json(orient="records"), 200, {"Content-Type": "application/json"}

@app.route('/stats/content', methods=['GET'])
def word_frequencies():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    try:
        return jsonify(stat_obj.content_analysis()), 200
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
        return jsonify(stat_obj.time_analysis()), 200
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
        return jsonify(stat_obj.user_analysis()), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
@app.route('/filter/search', methods=["POST"])
def search_dataset():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400

    data = request.get_json(silent=True) or {}

    if "query" not in data:
        return jsonify(stat_obj.df.to_dict(orient="records")), 200
    
    query = data["query"]
    filtered_df = stat_obj.search(query)

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