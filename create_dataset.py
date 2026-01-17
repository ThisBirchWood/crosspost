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

def post_to_dict(post):
    d = post.__dict__.copy()

    if post.comments:
        d["comments"] = [c.__dict__ for c in post.comments]
    return d


def main():
    boards_posts = boards_connector.get_new_category_posts('cork-city', limit=400)
    
    reddit_posts = reddit_connector.get_new_subreddit_posts('cork', limit=400)
    reddit_posts = remove_empty_posts(reddit_posts)

    ireland_posts = reddit_connector.search_subreddit('cork', 'ireland', limit=400, timeframe='year')
    ireland_posts = remove_empty_posts(ireland_posts)

    posts = boards_posts + reddit_posts + ireland_posts

    with open(data_file, 'w') as f:
        json.dump([post_to_dict(post) for post in posts], f, indent=4)

if __name__ == "__main__":
    main()