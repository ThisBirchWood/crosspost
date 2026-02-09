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

    def to_dict(self):
        return {
            "id": self.id,
            "post_id": self.post_id,
            "author": self.author,
            "content": self.content,
            "timestamp": self.timestamp,
            "reply_to": self.reply_to,
            "source": self.source,
        }
