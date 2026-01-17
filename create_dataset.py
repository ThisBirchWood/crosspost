import json
import logging
from connectors.reddit_api import RedditAPI
from connectors.boards_api import BoardsAPI

data_file = 'data/posts.json'
reddit_connector = RedditAPI()
boards_connector = BoardsAPI()

logging.basicConfig(level=logging.DEBUG)
logging.getLogger("urllib3").setLevel(logging.WARNING)

def remove_empty_posts(posts):
    return [post for post in posts if post.content.strip() != ""]

def main():
    boards_posts = boards_connector.get_new_category_posts('cork-city', limit=500)
    
    reddit_posts = reddit_connector.get_new_subreddit_posts('cork', limit=500)
    reddit_posts = remove_empty_posts(reddit_posts)

    posts = boards_posts + reddit_posts

    with open(data_file, 'w') as f:
        json.dump([post.__dict__ for post in posts], f, indent=4)

if __name__ == "__main__":
    main()