from flask import Flask
from db.database import Database
from connectors.reddit_connector import RedditConnector

app = Flask(__name__)
db = Database(db_name='ethnograph', user='ethnograph_user', password='ethnograph_pass')

reddit_connector = RedditConnector()

@app.route('/get_reddit_posts/<string:search>/<int:limit>', methods=['GET'])
def index(search, limit = 10):
    posts = reddit_connector.search_posts(search, limit=limit)
    return {"posts": [post.__dict__ for post in posts]}


if __name__ == "__main__":
    app.run(debug=True)