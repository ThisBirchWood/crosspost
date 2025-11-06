from connectors.base_connector import BaseConnector
from dto.post import Post
from dto.user import User
import requests

class RedditConnector(BaseConnector):
    def __init__(self):
        self.url = "https://www.reddit.com/"

    def get_top_posts(self, limit: int = 10, timeframe: str = 'day') -> list[Post]:
        params = {
            'limit': limit,
            't': timeframe
        }
        url = f"{self.url}top.json"
        data = self._fetch_data(url, params)
        return self._parse_posts(data)
    
    def search_posts(self, search: str, limit: int = 10, before = None, after = None) -> list[Post]:
        params = {
            'q': search,
            'limit': limit,
            'before': before,
            'after': after,
            'sort': 'relevance',
            't': 'day'
        }
        url = f"{self.url}search.json"
        data = self._fetch_data(url, params)
        return self._parse_posts(data)
    
    def get_user(self, username: str) -> User:
        data = self._fetch_data(f"user/{username}/about.json", {})
        return self._parse_user(data)
    
    def _parse_posts(self, data) -> list[Post]:
        posts = []
        for item in data['data']['children']:
            post_data = item['data']
            post = Post(
                author=post_data['author'],
                title=post_data['title'],
                content=post_data.get('selftext', ''),
                url=post_data['url'],
                timestamp=post_data['created_utc'])
            post.subreddit = post_data['subreddit']
            post.upvotes = post_data['ups']

            posts.append(post)
        return posts
    
    def _parse_user(self, data) -> User:
        user_data = data['data']
        user = User(
            username=user_data['name'],
            created_utc=user_data['created_utc'])
        user.karma = user_data['total_karma']
        return user
    
    def _fetch_data(self, endpoint: str, params: dict) -> dict:
        url = f"{self.url}{endpoint}"
        try:
            response = requests.get(url, headers={'User-agent': 'your bot 0.1'}, params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching data from Reddit API: {e}")
            return {}