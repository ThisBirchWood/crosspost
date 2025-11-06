class Post:
    def __init__(self, author: str, 
                 title: str, 
                 content: str, 
                 url: str, 
                 timestamp: float, 
                 source: str):
        self.author = author
        self.title = title
        self.content = content
        self.url = url
        self.timestamp = timestamp
        self.source = source
        
        # Optionals
        self.subreddit = None
        self.upvotes = None
        self.comments = None