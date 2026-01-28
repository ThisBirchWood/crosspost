from flask import Flask, jsonify, request
from flask_cors import CORS
from server.stat_gen import StatGen

app = Flask(__name__)

# Allow for CORS from localhost:5173
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Global State
stat_obj = None

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
        stat_obj = StatGen(post_file, comment_file)
    except ValueError as e:
        return jsonify({"error": f"Failed to read JSONL file: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
    return jsonify({"message": "File uploaded successfully", "event_count": len(stat_obj.df)}), 200

@app.route('/stats/events_per_day', methods=['GET'])
def posts_per_day():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400

    try:
        return jsonify(stat_obj.get_events_per_day().to_dict(orient='records')), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route("/stats/heatmap", methods=["GET"])
def get_heatmap():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400

    try:
        return jsonify(stat_obj.get_heatmap().to_dict(orient="records")), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/stats/word_frequencies', methods=['GET'])
def word_frequencies():
    if stat_obj is None:
        return jsonify({"error": "No data uploaded"}), 400
    
    try:
        return jsonify(stat_obj.get_word_frequencies().to_dict(orient='records')), 200
    except ValueError as e:
        return jsonify({"error": f"Malformed or missing data: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)