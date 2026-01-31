from flask import Flask, jsonify, request
from flask_cors import CORS
from server.stat_gen import StatGen

import pandas as pd
import traceback

app = Flask(__name__)

# Allow for CORS from localhost:5173
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Global State
posts_df = pd.read_json('posts.jsonl', lines=True)
comments_df = pd.read_json('comments.jsonl', lines=True)
stat_obj = StatGen(posts_df, comments_df)

@app.route('/upload', methods=['POST'])
def upload_data():
    if "posts" not in request.files or "comments" not in request.files:
        return jsonify({"error": "Missing posts or comments file"}), 400

    post_file = request.files["posts"]
    comment_file = request.files["comments"]

    if post_file.filename == "" or comment_file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    if not post_file.filename.endswith('.jsonl') or not comment_file.filename.endswith('.jsonl'):
        return jsonify({"error": "Invalid file type. Only .jsonl files are allowed."}), 400
    
    try:
        global stat_obj

        posts_df = pd.read_json(post_file, lines=True)
        comments_df = pd.read_json(comment_file, lines=True)
        stat_obj = StatGen(posts_df, comments_df)
    except ValueError as e:
        return jsonify({"error": f"Failed to read JSONL file: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
    return jsonify({"message": "File uploaded successfully", "event_count": len(stat_obj.df)}), 200

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
    
@app.route('/stats/search', methods=["POST"])
def search_dataset():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400

    data = request.get_json(silent=True) or {}

    if "query" not in data:
        return stat_obj.df
    
    query = data["query"]
    return jsonify(stat_obj.filter_events(query).to_dict(orient='records')), 200

@app.route('/stats/summary', methods=["GET"])
def get_summary():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    try:
        return jsonify(stat_obj.get_summary()), 200
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

@app.route('/reset', methods=["GET"])
def reset_dataset():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    stat_obj.reset_dataset()

    return jsonify({"success": "Dataset successfully reset"})
    

if __name__ == "__main__":
    app.run(debug=True)