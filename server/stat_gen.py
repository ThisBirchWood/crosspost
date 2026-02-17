import pandas as pd
import datetime
import nltk

from nltk.corpus import stopwords
from server.nlp import NLP
from server.analysis.temporal import TemporalAnalysis
from server.analysis.emotional import EmotionalAnalysis
from server.analysis.interactional import InteractionAnalysis
from server.analysis.linguistic import LinguisticAnalysis

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
    def __init__(self, df: pd.DataFrame, domain_topics: dict) -> None:
        comments_df = df[["id", "comments"]].explode("comments")
        comments_df = comments_df[comments_df["comments"].apply(lambda x: isinstance(x, dict))]
        comments_df = pd.json_normalize(comments_df["comments"])

        posts_df = df.drop(columns=["comments"])
        posts_df["type"] = "post"
        posts_df["parent_id"] = None

        comments_df["type"] = "comment"
        comments_df["parent_id"] = comments_df.get("post_id")
        self.domain_topics = domain_topics

        self.df = pd.concat([posts_df, comments_df])
        self.df.drop(columns=["post_id"], inplace=True, errors="ignore")
        self.nlp = NLP(self.df, "title", "content", domain_topics)
        self._add_extra_cols(self.df)

        self.temporal_analysis = TemporalAnalysis(self.df)
        self.emotional_analysis = EmotionalAnalysis(self.df)
        self.interaction_analysis = InteractionAnalysis(self.df, EXCLUDE_WORDS)
        self.linguistic_analysis = LinguisticAnalysis(self.df, EXCLUDE_WORDS)

        self.original_df = self.df.copy(deep=True)

    ## Private Methods
    def _add_extra_cols(self, df: pd.DataFrame) -> None:
        df['timestamp'] = pd.to_numeric(self.df['timestamp'], errors='coerce')
        df['date'] = pd.to_datetime(df['timestamp'], unit='s').dt.date
        df["dt"] = pd.to_datetime(df["timestamp"], unit="s", utc=True)
        df["hour"] = df["dt"].dt.hour
        df["weekday"] = df["dt"].dt.day_name()
        
        self.nlp.add_emotion_cols()
        self.nlp.add_topic_col()
    
    ## Public
    def time_analysis(self) -> pd.DataFrame:
        return {
            "events_per_day": self.temporal_analysis.posts_per_day(),
            "weekday_hour_heatmap": self.temporal_analysis.heatmap()
        }

    def content_analysis(self) -> dict:
        return {
            "word_frequencies": self.linguistic_analysis.word_frequencies(),
            "common_two_phrases": self.linguistic_analysis.ngrams(),
            "common_three_phrases": self.linguistic_analysis.ngrams(n=3),
            "average_emotion_by_topic": self.emotional_analysis.avg_emotion_by_topic(),
            "reply_time_by_emotion": self.temporal_analysis.avg_reply_time_per_emotion()
        }
    
    def user_analysis(self) -> dict:
        return {
            "top_users": self.interaction_analysis.top_users(),
            "users": self.interaction_analysis.per_user_analysis(),
            "interaction_graph": self.interaction_analysis.interaction_graph()
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
            "sources": self.df["source"].dropna().unique().tolist()
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

