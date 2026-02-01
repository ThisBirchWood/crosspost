import pandas as pd
import re
import nltk
import datetime

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

        self.original_df = self.df.copy(deep=True)

    ## Private Methods
    def _add_date_cols(self, df: pd.DataFrame) -> None:
        df['date'] = pd.to_datetime(df['timestamp'], unit='s').dt.date
        df["dt"] = pd.to_datetime(df["timestamp"], unit="s", utc=True)
        df["hour"] = df["dt"].dt.hour
        df["weekday"] = df["dt"].dt.day_name()
    
    ## Public
    def time_analysis(self) -> pd.DataFrame:
        per_day = (
            self.df.groupby("date")
            .size()
            .reset_index(name="count")
        )

        weekday_order = [
            "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday", "Sunday"
        ]

        self.df["weekday"] = pd.Categorical(
            self.df["weekday"],
            categories=weekday_order,
            ordered=True
        )

        heatmap = (
            self.df
            .groupby(["weekday", "hour"], observed=True)
            .size()
            .unstack(fill_value=0)
            .reindex(columns=range(24), fill_value=0)
        )
    
        heatmap.columns = heatmap.columns.map(str)
        
        burst_index = per_day["count"].std() / max(per_day["count"].mean(), 1)

        return {
            "events_per_day": per_day.to_dict(orient="records"),
            "weekday_hour_heatmap": heatmap.to_dict(orient="records"),
            "burstiness": round(burst_index, 2)
        }
    
    def summary(self) -> dict:
        total_posts = (self.df["type"] == "post").sum()
        total_comments = (self.df["type"] == "comment").sum()

        events_per_user = self.df.groupby("author").size()

        return {
            "total_events": int(len(self.df)),
            "total_posts": int(total_posts),
            "total_comments": int(total_comments),
            "unique_users": int(events_per_user.count()),
            "comments_per_post": round(total_comments / max(total_posts, 1), 2),
            "lurker_ratio": round((events_per_user == 1).mean(), 2),
            "time_range": {
                "start": int(self.df["dt"].min().timestamp()),
                "end": int(self.df["dt"].max().timestamp())
            },
            "sources": self.df["source"].unique().tolist()
        }

    def content_analysis(self, limit: int = 100) -> dict:
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

        word_frequencies = (
            pd.DataFrame(counts.items(), columns=["word", "count"])
            .sort_values("count", ascending=False)
            .head(limit)
            .reset_index(drop=True)
        )

        return {
            "word_frequencies": word_frequencies.to_dict(orient='records')
        }
    
    def user_analysis(self) -> dict:
        counts = (
            self.df.groupby(["author", "source"])
            .size()
            .sort_values(ascending=False)
        )

        per_user = (
            self.df.groupby(["author", "type"])
            .size()
            .unstack(fill_value=0)
        )

        per_user["comment_post_ratio"] = per_user["comment"] / per_user["post"].replace(0, 1)
        per_user["comment_share"] = per_user["comment"] / (per_user["post"] + per_user["comment"]).replace(0, 1)
        per_user = per_user.sort_values("comment_post_ratio", ascending=True)

        return {
            "top_users": [
                {"author": author, "source": source, "count": int(count)}
                for (author, source), count in counts.items()
            ],
            "users": per_user.reset_index().to_dict(orient="records")
        }
    
    def search(self, search_query: str) -> dict:
        self.df = self.df[
            self.df["content"].str.contains(search_query)
        ]

        return {
            "rows": len(self.df),
            "data": self.df.to_dict(orient="records")
        }
    
    def set_time_range(self, start: datetime.datetime, end: datetime.datetime) -> dict:
        self.df = self.df[
            (self.df["dt"] >= start) &
            (self.df["dt"] <= end)
        ]

        return {
            "rows": len(self.df),
            "data": self.df.to_dict(orient="records")
        }
    
    """
    Input is a hash map (source_name: str -> enabled: bool)
    """
    def filter_data_sources(self, data_sources: dict) -> dict:
        enabled_sources = [src for src, enabled in data_sources.items() if enabled]

        if not enabled_sources:
            raise ValueError("Please choose at least one data source")
        
        self.df = self.df[self.df["source"].isin(enabled_sources)]

        return {
            "rows": len(self.df),
            "data": self.df.to_dict(orient="records")
        }

    
    def reset_dataset(self) -> None:
        self.df = self.original_df.copy(deep=True)

