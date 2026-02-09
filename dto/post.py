from dto.comment import Comment

class Post:
    def __init__(self, 
                 id: str,
                 author: str, 
                 title: str, 
                 content: str, 
                 url: str, 
                 timestamp: float, 
                 source: str,
                 comments: list[Comment]):
        self.id = id
        self.author = author
        self.title = title
        self.content = content
        self.url = url
        self.timestamp = timestamp
        self.source = source
        self.comments = comments
        
        # Optionals
        self.subreddit = None
        self.upvotes = None

    def to_dict(self):
        return {
            "id": self.id,
            "author": self.author,
            "title": self.title,
            "content": self.content,
            "url": self.url,
            "timestamp": self.timestamp,
            "source": self.source,
            "comments": [
                c.to_dict() if hasattr(c, "to_dict") else c
                for c in self.comments
            ],
            "subreddit": self.subreddit,
            "upvotes": self.upvotes,
        }