class Post:
    def __init__(self, author, title, content, url, timestamp):
        self.author = author
        self.title = title
        self.content = content
        self.url = url
        self.timestamp = timestamp

        # Optionals
        self.subreddit = None
        self.upvotes = None