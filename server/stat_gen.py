import pandas as pd
import re
import nltk

from nltk.corpus import stopwords
from collections import Counter

DOMAIN_STOPWORDS = {
    "www", "https", "http",
    "boards", "boardsie",
    "comment", "comments",
    "discussion", "thread",
    "post", "posts",
    "would", "could", "should",
    "like", "get", "one"
}

nltk.download('stopwords')
EXCLUDE_WORDS = set(stopwords.words('english')) | DOMAIN_STOPWORDS

class StatGen:
    def __init__(self, posts_df: pd.DataFrame, comments_df: pd.DataFrame) -> None:
        posts_df["type"] = "post"
        posts_df["parent_id"] = None

        comments_df["type"] = "comment"
        comments_df["parent_id"] = comments_df.get("post_id")

        self.df = pd.concat([posts_df, comments_df])
        self.original_df = self.df.copy(deep=True)
        self._add_date_cols(self.df)

    ## Private Methods
    def _add_date_cols(self, df: pd.DataFrame) -> None:
        df['date'] = pd.to_datetime(df['timestamp'], unit='s').dt.date
        df["dt"] = pd.to_datetime(df["timestamp"], unit="s", utc=True)
        df["hour"] = df["dt"].dt.hour
        df["weekday"] = df["dt"].dt.day_name()
    
    ## Public
    def get_heatmap(self) -> pd.DataFrame:
        weekday_order = [
            "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday", "Sunday"
        ]

        self.df["weekday"] = pd.Categorical(
            self.df["weekday"],
            categories=weekday_order,
            ordered=True
        )

        return (
            self.df
            .groupby(["weekday", "hour"], observed=True)
            .size()
            .unstack(fill_value=0)
            .reindex(columns=range(24), fill_value=0)
        )
    
    def get_word_frequencies(self, limit: int = 100) -> pd.DataFrame:
        texts = (
            self.df["content"]
            .dropna()
            .astype(str)
            .str.lower()
        )

        words = []
        for text in texts:
            tokens = re.findall(r"\b[a-z]{3,}\b", text)
            words.extend(
                w for w in tokens
                if w not in EXCLUDE_WORDS
            )

        counts = Counter(words)

        return (
            pd.DataFrame(counts.items(), columns=["word", "count"])
            .sort_values("count", ascending=False)
            .head(limit)
            .reset_index(drop=True)
        )
    
    def get_events_per_day(self) -> pd.DataFrame:
        return (
            self.df
            .groupby('date')
            .size()
            .reset_index(name='event_count')
        )
    
    def filter_events(self, search_query: str) -> pd.DataFrame:
        self.df = self.df[self.df["content"].str.contains(search_query)]
        return self.df
    
    def reset_dataset(self) -> None:
        self.df = self.original_df.copy(deep=True)

    def get_summary(self) -> dict:
        return {
            "total_events": int(len(self.df)),
            "total_posts": int((self.df["type"] == "post").sum()),
            "total_comments": int((self.df["type"] == "comment").sum()),
            "unique_users": int(self.df["author"].nunique()),
            "time_range": {
                "start": int(self.df["dt"].min().timestamp()),
                "end": int(self.df["dt"].max().timestamp())
            }
        }


