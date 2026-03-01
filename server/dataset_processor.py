import pandas as pd

from server.analysis.nlp import NLP

class DatasetProcessor:
    def __init__(self, df, topics):
        self.df = self._explode_comments(df)
        self.topics = topics
        self.nlp = NLP(self.df, "title", "content", self.topics)

    def _explode_comments(self, df) -> pd.DataFrame:
        comments_df = df[["id", "comments"]].explode("comments")
        comments_df = comments_df[comments_df["comments"].apply(lambda x: isinstance(x, dict))]
        comments_df = pd.json_normalize(comments_df["comments"])

        posts_df = df.drop(columns=["comments"])
        posts_df["type"] = "post"
        posts_df["parent_id"] = None

        comments_df["type"] = "comment"
        comments_df["parent_id"] = comments_df.get("post_id")

        df = pd.concat([posts_df, comments_df])
        df.drop(columns=["post_id"], inplace=True, errors="ignore")

        return df
    
    def enrich(self) -> pd.DataFrame:
        self.df['timestamp'] = pd.to_numeric(self.df['timestamp'], errors='raise')
        self.df['date'] = pd.to_datetime(self.df['timestamp'], unit='s').dt.date
        self.df["dt"] = pd.to_datetime(self.df["timestamp"], unit="s", utc=True)
        self.df["hour"] = self.df["dt"].dt.hour
        self.df["weekday"] = self.df["dt"].dt.day_name()
        
        self.nlp.add_emotion_cols()
        self.nlp.add_topic_col()
        self.nlp.add_ner_cols()

        return self.df