from flask import Flask
from connectors.reddit_connector import RedditConnector
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = Flask(__name__)

reddit_connector = RedditConnector()

@app.route('/fetch_subreddit/<string:subreddit>/<int:limit>', methods=['GET'])
def fetch_subreddit(subreddit, limit = 10):
    posts = reddit_connector.get_top_subreddit_posts(subreddit, limit=limit, timeframe='all')
    return {"status": "success", "posts": [post.__dict__ for post in posts]}

if __name__ == "__main__":
    app.run(debug=True)