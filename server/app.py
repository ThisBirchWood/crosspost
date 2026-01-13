from flask import Flask
from db.database import Database
from connectors.reddit_connector import RedditConnector
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = Flask(__name__)
db = Database(db_name='ethnograph', user='ethnograph_user', password='ethnograph_pass')

reddit_connector = RedditConnector()

@app.route('/fetch_subreddit/<string:subreddit>/<int:limit>', methods=['GET'])
def fetch_subreddit(subreddit, limit = 10):
    posts = reddit_connector.get_top_subreddit_posts(subreddit, limit=limit, timeframe='all')

    db.execute_many(
        """INSERT INTO ethnograph.posts (title, content, author_username, created_utc)
           VALUES (%s, %s, %s, to_timestamp(%s));""",
        [(post.title, post.content, post.author, post.timestamp) for post in posts]
    )

    return {"status": "success", "inserted_posts": len(posts)}

@app.route('/sentiment', methods=['GET'])
def sentiment_analysis():
    posts = db.execute_query(
        "SELECT id, title, content FROM ethnograph.posts;"
    )

    analyzer = SentimentIntensityAnalyzer()

    total_sentiment = 0.0
    count = 0

    for post in posts:
        content = post.get("title")
        if not content:
            continue

        score = analyzer.polarity_scores(content)["compound"]
        total_sentiment += score
        count += 1

    average_sentiment = total_sentiment / count if count else 0.0

    return {
        "status": "success",
        "average_sentiment": average_sentiment,
        "posts_analyzed": count
    }

if __name__ == "__main__":
    app.run(debug=True)