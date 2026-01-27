from flask import Flask, jsonify, request
import pandas as pd

app = Flask(__name__)

@app.route('/upload', methods=['POST'])
def upload_data():
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400
    
    if not file.filename.endswith('.jsonl'):
        return jsonify({"error": "Invalid file type. Only .jsonl files are allowed."}), 400
    
    try:
        df = pd.read_json(file, lines=True)
    except ValueError as e:
        return jsonify({"error": f"Failed to read JSONL file: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
    return jsonify({"message": "File uploaded successfully", "data_preview": df.head().to_dict(orient='records')}), 200

if __name__ == "__main__":
    app.run(debug=True)