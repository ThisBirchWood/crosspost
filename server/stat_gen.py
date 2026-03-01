import datetime

import nltk
import pandas as pd
from nltk.corpus import stopwords

from server.analysis.cultural import CulturalAnalysis
from server.analysis.emotional import EmotionalAnalysis
from server.analysis.interactional import InteractionAnalysis
from server.analysis.linguistic import LinguisticAnalysis
from server.analysis.temporal import TemporalAnalysis

DOMAIN_STOPWORDS = {
    "www",
    "https",
    "http",
    "boards",
    "boardsie",
    "comment",
    "comments",
    "discussion",
    "thread",
    "post",
    "posts",
    "would",
    "get",
    "one",
}

nltk.download("stopwords")
EXCLUDE_WORDS = set(stopwords.words("english")) | DOMAIN_STOPWORDS


class StatGen:
    def __init__(self) -> None:
        self.temporal_analysis = TemporalAnalysis()
        self.emotional_analysis = EmotionalAnalysis()
        self.interaction_analysis = InteractionAnalysis(EXCLUDE_WORDS)
        self.linguistic_analysis = LinguisticAnalysis(EXCLUDE_WORDS)
        self.cultural_analysis = CulturalAnalysis()

        self.search_query = ""
        self.start_date_filter = None
        self.end_date_filter = None
        self.data_source_filters = set()

    ## Private Methods
    def _prepare_filtered_df(self, df: pd.DataFrame) -> pd.DataFrame:
        filtered_df = df.copy()

        if self.search_query:
            mask = (
                filtered_df["content"].str.contains(self.search_query, case=False, na=False)
                | filtered_df["author"].str.contains(self.search_query, case=False, na=False).fillna(False)
                | filtered_df["title"].str.contains(self.search_query, case=False, na=False, regex=False).fillna(False)
            )
            filtered_df = filtered_df[mask]

        if self.start_date_filter and self.end_date_filter:
            filtered_df = filtered_df[
                (filtered_df["dt"] >= self.start_date_filter) & (filtered_df["dt"] <= self.end_date_filter)
            ]

        if self.data_source_filters:
            enabled_sources = [src for src, enabled in self.data_source_filters.items() if enabled]
            if enabled_sources:
                filtered_df = filtered_df[filtered_df["source"].isin(enabled_sources)]

        return filtered_df

    ## Public Methods

    def get_time_analysis(self, df: pd.DataFrame) -> dict:
        return {
            "events_per_day": self.temporal_analysis.posts_per_day(df),
            "weekday_hour_heatmap": self.temporal_analysis.heatmap(df),
        }

    def get_content_analysis(self, df: pd.DataFrame) -> dict:
        return {
            "word_frequencies": self.linguistic_analysis.word_frequencies(df),
            "common_two_phrases": self.linguistic_analysis.ngrams(df),
            "common_three_phrases": self.linguistic_analysis.ngrams(df, n=3),
            "average_emotion_by_topic": self.emotional_analysis.avg_emotion_by_topic(df),
            "reply_time_by_emotion": self.temporal_analysis.avg_reply_time_per_emotion(df),
        }

    def get_user_analysis(self, df: pd.DataFrame) -> dict:
        return {
            "top_users": self.interaction_analysis.top_users(df),
            "users": self.interaction_analysis.per_user_analysis(df),
            "interaction_graph": self.interaction_analysis.interaction_graph(df),
        }

    def get_interactional_analysis(self, df: pd.DataFrame) -> dict:
        return {
            "average_thread_depth": self.interaction_analysis.average_thread_depth(df),
            "average_thread_length_by_emotion": self.interaction_analysis.average_thread_length_by_emotion(df),
        }

    def get_cultural_analysis(self, df: pd.DataFrame) -> dict:
        return {
            "identity_markers": self.cultural_analysis.get_identity_markers(df),
            "stance_markers": self.cultural_analysis.get_stance_markers(df),
            "entity_salience": self.cultural_analysis.get_avg_emotions_per_entity(df),
        }

    def summary(self, df: pd.DataFrame) -> dict:
        total_posts = (df["type"] == "post").sum()
        total_comments = (df["type"] == "comment").sum()
        events_per_user = df.groupby("author").size()

        return {
            "total_events": int(len(df)),
            "total_posts": int(total_posts),
            "total_comments": int(total_comments),
            "unique_users": int(events_per_user.count()),
            "comments_per_post": round(total_comments / max(total_posts, 1), 2),
            "lurker_ratio": round((events_per_user == 1).mean(), 2),
            "time_range": {
                "start": int(df["dt"].min().timestamp()),
                "end": int(df["dt"].max().timestamp()),
            },
            "sources": df["source"].dropna().unique().tolist(),
        }

    def set_search_query(self, search_query: str) -> None:
        self.search_query = search_query

    def set_start_date(self, start: datetime.datetime) -> None:
        self.start_date_filter = start

    def set_end_date(self, end: datetime.datetime) -> None:
        self.end_date_filter = end

    def set_data_sources(self, data_sources: set) -> None:
        self.data_source_filters = data_sources
        
    def reset_filters(self) -> None:
        self.search_query = ""
        self.start_date_filter = None
        self.end_date_filter = None
        self.data_source_filters = set()
