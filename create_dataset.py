import json
from connectors.reddit_api import RedditAPI

data_file = 'data/reddit_posts.json'
reddit_connector = RedditAPI()
def remove_empty_posts(posts):
    return [post for post in posts if post.content.strip() != ""]

def main():
    posts = reddit_connector.get_new_subreddit_posts('cork', limit=1000)
    posts = remove_empty_posts(posts)

    print(f"Fetched {len(posts)} posts from r/cork")

    with open(data_file, 'w') as f:
        json.dump([post.__dict__ for post in posts], f, indent=4)

if __name__ == "__main__":
    main()