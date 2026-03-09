from abc import ABC, abstractmethod
from dto.post import Post

class BaseConnector(ABC):
    # Each subclass declares these at the class level
    source_name: str       # machine-readable: "reddit", "youtube"
    display_name: str      # human-readable: "Reddit", "YouTube"
    required_env: list[str] = []  # env vars needed to activate

    @classmethod
    def is_available(cls) -> bool:
        """Returns True if all required env vars are set."""
        import os
        return all(os.getenv(var) for var in cls.required_env)

    @abstractmethod
    def get_new_posts_by_search(self, 
                                search: str = None, 
                                category: str = None, 
                                post_limit: int = 10, 
                                comment_limit: int = 10
                                ) -> list[Post]:
        ...