from connectors.reddit_connector import RedditConnector

if __name__ == "__main__":
    connector = RedditConnector()

    search_results = connector.search_posts(search="NVIDIA", limit=10)
    for post in search_results:
        print(f"Title: {post.title}\nAuthor: {post.author}\nSubreddit: {post.subreddit}\nUpvotes: {post.upvotes}")
        print("---")