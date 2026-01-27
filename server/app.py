from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)

# Allow for CORS from localhost:5173
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Global State
posts_df = None
comments_df = None

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
        global posts_df, comments_df
        posts_df = pd.read_json(post_file, lines=True)
        comments_df = pd.read_json(comment_file, lines=True)
    except ValueError as e:
        return jsonify({"error": f"Failed to read JSONL file: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
    return jsonify({"message": "File uploaded successfully", "posts_count": len(posts_df), "comments_count": len(comments_df)}), 200

@app.route('/stats/posts_per_day', methods=['GET'])
def posts_per_day():
    if posts_df is None:
        return jsonify({"error": "No data uploaded"}), 400

    try:
        posts_df['date'] = pd.to_datetime(posts_df['timestamp'], unit='s').dt.date
        posts_per_day = (
            posts_df
            .groupby('date')
            .size()
            .reset_index(name='posts_count')
        )
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    return jsonify(posts_per_day.to_dict(orient='records')), 200
    
@app.route('/stats/comments_per_day', methods=['GET'])
def comments_per_day():
    if comments_df is None:
        return jsonify({"error": "No data uploaded"}), 400

    try:
        comments_df['date'] = pd.to_datetime(comments_df['timestamp'], unit='s').dt.date
        comments_per_day = (
            comments_df
            .groupby('date')
            .size()
            .reset_index(name='comments_count')
        )
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    return jsonify(comments_per_day.to_dict(orient='records')), 200

if __name__ == "__main__":
    app.run(debug=True)