from abc import abstractmethod
from abc import ABC
from dto.post import Post
from dto.user import User
from datetime import datetime

class BaseConnector(ABC):
    @abstractmethod
    def get_top_posts(self, limit: int = 10, timeframe: str = 'day') -> list[Post]:
        pass

    @abstractmethod
    def search_posts(self, search: str, limit: int = 10, before = None, after = None) -> list[Post]:
        pass

    @abstractmethod
    def get_user(self, username: str) -> User:
        pass