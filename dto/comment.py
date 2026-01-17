class Comment:
    def __init__(self,
                 id: str,
                 post_id: str,
                 author: str,
                 content: str,
                 timestamp: float,
                 reply_to: str,
                 source: str):
        self.id = id
        self.post_id = post_id
        self.author = author
        self.content = content
        self.timestamp = timestamp
        self.reply_to = reply_to
        self.source = source
