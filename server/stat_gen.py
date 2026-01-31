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
        self._add_date_cols(self.df)

        # Datasets
        self.heatmap = self._generate_heatmap()
        self.word_frequencies = self._get_word_frequencies(100)
        self.events_per_day = self._get_events_per_day()

    ## Private Methods
    def _add_date_cols(self, df: pd.DataFrame) -> None:
        df['date'] = pd.to_datetime(df['timestamp'], unit='s').dt.date
        df["dt"] = pd.to_datetime(df["timestamp"], unit="s", utc=True)
        df["hour"] = df["dt"].dt.hour
        df["weekday"] = df["dt"].dt.day_name()

    def _get_events_per_day(self) -> pd.DataFrame:
        return (
            self.df
            .groupby('date')
            .size()
            .reset_index(name='posts_count')
        )

    def _generate_heatmap(self) -> pd.DataFrame:
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

    def _get_word_frequencies(self, limit: int) -> pd.DataFrame:
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
    
    ## Public
    def get_heatmap(self) -> pd.DataFrame:
        return self.heatmap
    
    def get_word_frequencies(self) -> pd.DataFrame:
        return self.word_frequencies
    
    def get_events_per_day(self) -> pd.DataFrame:
        return self.events_per_day
    
    def get_events_containing(self, search_query: str) -> pd.DataFrame:
        return self.df[self.df["content"].str.contains(search_query)]