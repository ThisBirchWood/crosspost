from connectors.reddit_connector import RedditConnector
from datetime import datetime

if __name__ == "__main__":
    connector = RedditConnector()

    search_results = connector.search_subreddit("China", "all", limit=5, timeframe="month")
    for post in search_results:
        print(f"Title: {post.title}\nAuthor: {post.author}\nSubreddit: {post.subreddit}\nUpvotes: {post.upvotes}\nSource: {post.source}\nTimestamp: {datetime.fromtimestamp(post.timestamp)}")
        print("---")