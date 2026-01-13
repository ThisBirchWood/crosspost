from dto.post import Post
from dto.user import User
import requests

class RedditConnector:
    def __init__(self):
        self.url = "https://www.reddit.com/"
        self.source_name = "Reddit"

    # Public Methods #
    def get_top_subreddit_posts(self, subreddit: str, limit: int = 10, timeframe: str = 'day') -> list[Post]:
        params = {
            'limit': limit,
            't': timeframe
        }
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
        url = f"r/{subreddit}/search.json"
        data = self._fetch_data(url, params)
        return self._parse_posts(data)
    
    def get_new_subreddit_posts(self, subreddit: str, limit: int = 10) -> list[Post]:
        params = {
            'limit': limit
        }
        url = f"r/{subreddit}/new.json"
        data = self._fetch_data(url, params)
        return self._parse_posts(data)
    
    def get_user(self, username: str) -> User:
        data = self._fetch_data(f"user/{username}/about.json", {})
        return self._parse_user(data)
    
    ## Private Methods ##
    def _parse_posts(self, data) -> list[Post]:
        posts = []
        for item in data['data']['children']:
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
            response = requests.get(url, headers={'User-agent': 'python:ethnography-college-project:0.1 (by /u/ThisBirchWood)'}, params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching data from Reddit API: {e}")
            return {}