import json
import logging
from connectors.reddit_api import RedditAPI
from connectors.boards_api import BoardsAPI
from connectors.youtube_api import YouTubeAPI

posts_file = 'data/posts.jsonl'
comments_file = 'data/comments.jsonl'

reddit_connector = RedditAPI()
boards_connector = BoardsAPI()
youtube_connector = YouTubeAPI()

logging.basicConfig(level=logging.DEBUG)
logging.getLogger("urllib3").setLevel(logging.WARNING)

def remove_empty_posts(posts):
    return [post for post in posts if post.content.strip() != ""]

def post_to_dict(post):
    d = post.__dict__.copy()
    return d

def save_to_jsonl(filename, posts):
    with open(filename, 'a', encoding='utf-8') as f:
        for post in posts:
            # Convert post object to dict if it's a dataclass
            data = post_to_dict(post)
            f.write(json.dumps(data) + '\n')


def main():
    boards_posts, boards_comments = boards_connector.get_new_category_posts('cork-city', limit=400)
    save_to_jsonl(posts_file, boards_posts)
    save_to_jsonl(comments_file, boards_comments)

    reddit_posts, reddit_comments = reddit_connector.get_new_subreddit_posts('cork', limit=400)
    reddit_posts = remove_empty_posts(reddit_posts)
    save_to_jsonl(posts_file, reddit_posts)
    save_to_jsonl(comments_file, reddit_comments)

    ireland_posts, ireland_comments = reddit_connector.search_new_subreddit_posts('cork', 'ireland', limit=10)
    ireland_posts = remove_empty_posts(ireland_posts)
    save_to_jsonl(posts_file, ireland_posts)
    save_to_jsonl(comments_file, ireland_comments)

    youtube_videos, youtube_comments = youtube_connector.fetch_video_and_comments('cork city', 100, 100)
    save_to_jsonl(posts_file, youtube_videos)
    save_to_jsonl(comments_file, youtube_comments)

if __name__ == "__main__":
    main()