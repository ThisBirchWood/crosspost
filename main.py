from connectors.reddit_connector import RedditConnector

if __name__ == "__main__":
    connector = RedditConnector()

    search_results = connector.get_top_posts(limit=5, timeframe='week')
    for post in search_results:
        print(f"Title: {post.title}\nAuthor: {post.author}\nSubreddit: {post.subreddit}\nUpvotes: {post.upvotes}")
        print("---")