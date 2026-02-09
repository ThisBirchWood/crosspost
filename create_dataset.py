import json
import logging
from connectors.reddit_api import RedditAPI
from connectors.boards_api import BoardsAPI
from connectors.youtube_api import YouTubeAPI

posts_file = 'posts_test.jsonl'

reddit_connector = RedditAPI()
boards_connector = BoardsAPI()
youtube_connector = YouTubeAPI()

logging.basicConfig(level=logging.DEBUG)
logging.getLogger("urllib3").setLevel(logging.WARNING)

def remove_empty_posts(posts):
    return [post for post in posts if post.content.strip() != ""]

def save_to_jsonl(filename, posts):
    with open(filename, 'a', encoding='utf-8') as f:
        for post in posts:
            # Convert post object to dict if it's a dataclass
            data = post.to_dict()
            f.write(json.dumps(data) + '\n')


def main():
    boards_posts = boards_connector.get_new_category_posts('cork-city', 10, 10)
    save_to_jsonl(posts_file, boards_posts)

    reddit_posts = reddit_connector.get_new_subreddit_posts('cork', 10)
    reddit_posts = remove_empty_posts(reddit_posts)
    save_to_jsonl(posts_file, reddit_posts)

    ireland_posts = reddit_connector.search_new_subreddit_posts('cork', 'ireland', 10)
    ireland_posts = remove_empty_posts(ireland_posts)
    save_to_jsonl(posts_file, ireland_posts)

    youtube_videos = youtube_connector.fetch_videos('cork city', 10, 10)
    save_to_jsonl(posts_file, youtube_videos)

if __name__ == "__main__":
    main()