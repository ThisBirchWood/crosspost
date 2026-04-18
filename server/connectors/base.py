from abc import ABC, abstractmethod
from dto.post import Post
import os


class BaseConnector(ABC):
    source_name: str  # machine readable
    display_name: str  # human readablee
    required_env: list[str] = []  

    search_enabled: bool
    categories_enabled: bool

    @classmethod
    def is_available(cls) -> bool:
        return all(os.getenv(var) for var in cls.required_env)

    @abstractmethod
    def get_new_posts_by_search(
        self, search: str = None, category: str = None, post_limit: int = 10
    ) -> list[Post]: ...

    @abstractmethod
    def category_exists(self, category: str) -> bool: ...
