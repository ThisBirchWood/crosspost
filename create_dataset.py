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
    boards_posts, boards_comments = boards_connector.get_new_category_posts('cork-city', limit=5)
    save_to_jsonl(posts_file, boards_posts)
    save_to_jsonl(comments_file, boards_comments)

    #reddit_posts = reddit_connector.get_new_subreddit_posts('cork', limit=350)
    #reddit_posts = remove_empty_posts(reddit_posts)
    #save_to_jsonl(data_file, reddit_posts)
    
    #ireland_posts = reddit_connector.search_subreddit('cork', 'ireland', limit=350, timeframe='year')
    #ireland_posts = remove_empty_posts(ireland_posts)
    #save_to_jsonl(data_file, ireland_posts)

    #youtube_videos = youtube_connector.fetch_and_parse_videos('cork city', 100, 100)
    #save_to_jsonl(data_file, youtube_videos)

if __name__ == "__main__":
    main()