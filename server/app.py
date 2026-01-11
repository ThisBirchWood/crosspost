from flask import Flask
from db.database import Database
from connectors.reddit_connector import RedditConnector

app = Flask(__name__)
db = Database(db_name='ethnograph', user='ethnograph_user', password='ethnograph_pass')

reddit_connector = RedditConnector()

@app.route('/fetch_reddit/<string:search>/<int:limit>', methods=['GET'])
def index(search, limit = 10):
    posts = reddit_connector.search_posts(search, limit=limit)

    db.execute_many(
        """INSERT INTO ethnograph.posts (title, content, author_username, created_utc)
           VALUES (%s, %s, %s, to_timestamp(%s));""",
        [(post.title, post.content, post.author, post.timestamp) for post in posts]
    )

    return {"status": "success", "inserted_posts": len(posts)}

@app.route('/fetch_subreddit/<string:subreddit>/<int:limit>', methods=['GET'])
def fetch_subreddit(subreddit, limit = 10):
    posts = reddit_connector.get_top_subreddit_posts(subreddit, limit=limit, timeframe='all')

    db.execute_many(
        """INSERT INTO ethnograph.posts (title, content, author_username, created_utc)
           VALUES (%s, %s, %s, to_timestamp(%s));""",
        [(post.title, post.content, post.author, post.timestamp) for post in posts]
    )

    return {"status": "success", "inserted_posts": len(posts)}

if __name__ == "__main__":
    app.run(debug=True)