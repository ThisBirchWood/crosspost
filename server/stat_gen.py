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

    ## Private Methods
    def _prepare_filtered_df(self, 
                             df: pd.DataFrame, 
                             filters: dict | None = None
                             ) -> pd.DataFrame:
        filters = filters or {}
        filtered_df = df.copy()

        search_query = filters.get("search_query", None)
        start_date_filter = filters.get("start_date", None)
        end_date_filter = filters.get("end_date", None)
        data_source_filter = filters.get("data_sources", None)

        if search_query:
            mask = (
                filtered_df["content"].str.contains(search_query, case=False, na=False)
                | filtered_df["author"]
                .str.contains(search_query, case=False, na=False)
                .fillna(False)
                | filtered_df["title"]
                .str.contains(search_query, case=False, na=False, regex=False)
                .fillna(False)
            )
            filtered_df = filtered_df[mask]

        if start_date_filter:
            filtered_df = filtered_df[(filtered_df["dt"] >= start_date_filter)]

        if end_date_filter:
            filtered_df = filtered_df[(filtered_df["dt"] <= end_date_filter)]

        if data_source_filter:
            filtered_df = filtered_df[filtered_df["source"].isin(data_source_filter)]

        return filtered_df

    ## Public Methods

    def get_time_analysis(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return {
            "events_per_day": self.temporal_analysis.posts_per_day(filtered_df),
            "weekday_hour_heatmap": self.temporal_analysis.heatmap(filtered_df),
        }

    def get_content_analysis(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return {
            "word_frequencies": self.linguistic_analysis.word_frequencies(filtered_df),
            "common_two_phrases": self.linguistic_analysis.ngrams(filtered_df),
            "common_three_phrases": self.linguistic_analysis.ngrams(filtered_df, n=3),
            "average_emotion_by_topic": self.emotional_analysis.avg_emotion_by_topic(
                filtered_df
            ),
            "reply_time_by_emotion": self.temporal_analysis.avg_reply_time_per_emotion(
                filtered_df
            ),
        }

    def get_user_analysis(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return {
            "top_users": self.interaction_analysis.top_users(filtered_df),
            "users": self.interaction_analysis.per_user_analysis(filtered_df),
            "interaction_graph": self.interaction_analysis.interaction_graph(
                filtered_df
            ),
        }

    def get_interactional_analysis(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return {
            "average_thread_depth": self.interaction_analysis.average_thread_depth(
                filtered_df
            ),
            "average_thread_length_by_emotion": self.interaction_analysis.average_thread_length_by_emotion(
                filtered_df
            ),
        }

    def get_cultural_analysis(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return {
            "identity_markers": self.cultural_analysis.get_identity_markers(
                filtered_df
            ),
            "stance_markers": self.cultural_analysis.get_stance_markers(filtered_df),
            "entity_salience": self.cultural_analysis.get_avg_emotions_per_entity(
                filtered_df
            ),
        }

    def summary(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        total_posts = (filtered_df["type"] == "post").sum()
        total_comments = (filtered_df["type"] == "comment").sum()
        events_per_user = filtered_df.groupby("author").size()

        if filtered_df.empty:
            return {
                "total_events": 0,
                "total_posts": 0,
                "total_comments": 0,
                "unique_users": 0,
                "comments_per_post": 0,
                "lurker_ratio": 0,
                "time_range": {
                    "start": None,
                    "end": None,
                },
                "sources": [],
            }

        return {
            "total_events": int(len(filtered_df)),
            "total_posts": int(total_posts),
            "total_comments": int(total_comments),
            "unique_users": int(events_per_user.count()),
            "comments_per_post": round(total_comments / max(total_posts, 1), 2),
            "lurker_ratio": round((events_per_user == 1).mean(), 2),
            "time_range": {
                "start": int(filtered_df["dt"].min().timestamp()),
                "end": int(filtered_df["dt"].max().timestamp()),
            },
            "sources": filtered_df["source"].dropna().unique().tolist(),
        }
