import requests
import logging
import time

from dto.post import Post
from dto.user import User
from dto.comment import Comment

logger = logging.getLogger(__name__)

class RedditAPI:
    def __init__(self):
        self.url = "https://www.reddit.com/"
        self.source_name = "Reddit"

    # Public Methods #
    def get_top_subreddit_posts(self, subreddit: str, limit: int = 10, timeframe: str = 'day') -> list[Post]:
        params = {
            'limit': limit,
            't': timeframe
        }

        logger.info(f"Fetching top posts from subreddit: {subreddit} with limit {limit} and timeframe '{timeframe}'")
        url = f"r/{subreddit}/top.json"
        data = self._fetch_data(url, params)
        return self._parse_posts(data)
    
    def search_subreddit(self, search: str, subreddit: str, limit: int = 10, timeframe: str = "day") -> list[Post]:
        params = {
            'q': search,
            'limit': limit,
            'restrict_sr': 'on',
            'sort': 'top',
            "t": timeframe
        }

        logger.info(f"Searching subreddit '{subreddit}' for '{search}' with limit {limit} and timeframe '{timeframe}'")
        url = f"r/{subreddit}/search.json"
        data = self._fetch_data(url, params)
        return self._parse_posts(data)
    
    def get_new_subreddit_posts(self, subreddit: str, limit: int = 10) -> list[Post]:
        posts = []
        after = None
        url = f"r/{subreddit}/new.json"

        logger.info(f"Fetching new posts from subreddit: {subreddit}")

        while len(posts) < limit:
            batch_limit = min(100, limit - len(posts))
            params = {
                'limit': batch_limit,
                'after': after
            }

            data = self._fetch_data(url, params)
            batch = self._parse_posts(data)

            logger.debug(f"Fetched {len(batch)} new posts from subreddit {subreddit}")

            if not batch:
                break
            
            posts.extend(batch)
            after = data['data'].get('after')
            if not after:
                break

        return posts
    
    def get_user(self, username: str) -> User:
        data = self._fetch_data(f"user/{username}/about.json", {})
        return self._parse_user(data)
    
    ## Private Methods ##
    def _parse_posts(self, data) -> list[Post]:
        posts = []
        total_num_posts = len(data['data']['children'])
        current_index = 0

        for item in data['data']['children']:
            current_index += 1
            logger.debug(f"Parsing post {current_index} of {total_num_posts}")

            post_data = item['data']
            post = Post(
                id=post_data['id'],
                author=post_data['author'],
                title=post_data['title'],
                content=post_data.get('selftext', ''),
                url=post_data['url'],
                timestamp=post_data['created_utc'],
                source=self.source_name)
            post.subreddit = post_data['subreddit']
            post.upvotes = post_data['ups']
            post.comments = self._get_post_comments(post.id)

            posts.append(post)
        return posts
    
    def _get_post_comments(self, post_id: str) -> list[Comment]:
        comments: list[Comment] = []
        url = f"comments/{post_id}.json"

        data = self._fetch_data(url, {})
        if len(data) < 2:
            return comments

        comment_data = data[1]['data']['children']

        def _parse_comment_tree(items, parent_id=None):
            for item in items:
                if item['kind'] != 't1':
                    continue

                comment_info = item['data']
                comment = Comment(
                    id=comment_info['id'],
                    post_id=post_id,
                    author=comment_info['author'],
                    content=comment_info.get('body', ''),
                    timestamp=comment_info['created_utc'],
                    reply_to=parent_id or comment_info.get('parent_id', None),
                    source=self.source_name
                )
                comment.upvotes = comment_info.get('ups', 0)

                comments.append(comment)

                # Process replies recursively
                replies = comment_info.get('replies')
                if replies and isinstance(replies, dict):
                    reply_items = replies.get('data', {}).get('children', [])
                    _parse_comment_tree(reply_items, parent_id=comment.id)

        _parse_comment_tree(comment_data)
        return comments
    
    def _parse_user(self, data) -> User:
        user_data = data['data']
        user = User(
            username=user_data['name'],
            created_utc=user_data['created_utc'])
        user.karma = user_data['total_karma']
        return user
    
    def _fetch_data(self, endpoint: str, params: dict) -> dict:
        url = f"{self.url}{endpoint}"
        max_retries = 15
        backoff = 1 # seconds

        for attempt in range(max_retries):
            try:
                response = requests.get(url, headers={'User-agent': 'python:ethnography-college-project:0.1 (by /u/ThisBirchWood)'}, params=params)

                if response.status_code == 429:
                    wait_time = response.headers.get("Retry-After", backoff)

                    logger.warning(f"Rate limited by Reddit API. Retrying in {wait_time} seconds...")

                    time.sleep(wait_time)
                    backoff *= 2
                    continue

                response.raise_for_status()
                return response.json()
            except requests.RequestException as e:
                print(f"Error fetching data from Reddit API: {e}")
                return {}