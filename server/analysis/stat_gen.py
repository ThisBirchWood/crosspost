import nltk
import pandas as pd
from nltk.corpus import stopwords

from server.analysis.cultural import CulturalAnalysis
from server.analysis.emotional import EmotionalAnalysis
from server.analysis.interactional import InteractionAnalysis
from server.analysis.linguistic import LinguisticAnalysis
from server.analysis.summary import SummaryAnalysis
from server.analysis.temporal import TemporalAnalysis
from server.analysis.user import UserAnalysis

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
        self.summary_analysis = SummaryAnalysis()
        self.user_analysis = UserAnalysis()

    ## Private Methods
    def _prepare_filtered_df(self, df: pd.DataFrame, filters: dict | None = None) -> pd.DataFrame:
        filters = filters or {}
        filtered_df = df.copy()

        search_query = filters.get("search_query", None)
        start_date_filter = filters.get("start_date", None)
        end_date_filter = filters.get("end_date", None)
        data_source_filter = filters.get("data_sources", None)

        if search_query:
            mask = filtered_df["content"].str.contains(
                search_query, case=False, na=False
            ) | filtered_df["author"].str.contains(search_query, case=False, na=False)

            # Only include title if the column exists
            if "title" in filtered_df.columns:
                mask = mask | filtered_df["title"].str.contains(
                    search_query, case=False, na=False, regex=False
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
    def filter_dataset(self, df: pd.DataFrame, filters: dict | None = None) -> list[dict]:
        return self._prepare_filtered_df(df, filters).to_dict(orient="records")

    def temporal(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return {
            "events_per_day": self.temporal_analysis.posts_per_day(filtered_df),
            "weekday_hour_heatmap": self.temporal_analysis.heatmap(filtered_df),
        }

    def linguistic(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return {
            "word_frequencies": self.linguistic_analysis.word_frequencies(filtered_df),
            "common_two_phrases": self.linguistic_analysis.ngrams(filtered_df),
            "common_three_phrases": self.linguistic_analysis.ngrams(filtered_df, n=3),
        }

    def emotional(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return {
            "average_emotion_by_topic": self.emotional_analysis.avg_emotion_by_topic(filtered_df),
            "overall_emotion_average": self.emotional_analysis.overall_emotion_average(filtered_df),
            "dominant_emotion_distribution": self.emotional_analysis.dominant_emotion_distribution(filtered_df),
            "emotion_by_source": self.emotional_analysis.emotion_by_source(filtered_df)
        }

    def user(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return {
            "top_users": self.user_analysis.top_users(filtered_df),
            "users": self.user_analysis.per_user_analysis(filtered_df)
        }

    def interactional(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return {
            "average_thread_depth": self.interaction_analysis.average_thread_depth(filtered_df),
            "average_thread_length_by_emotion": self.interaction_analysis.average_thread_length_by_emotion(filtered_df),
            "interaction_graph": self.interaction_analysis.interaction_graph(filtered_df)
        }

    def cultural(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return {
            "identity_markers": self.cultural_analysis.get_identity_markers(filtered_df),
            "stance_markers": self.cultural_analysis.get_stance_markers(filtered_df),
            "avg_emotion_per_entity": self.cultural_analysis.get_avg_emotions_per_entity(filtered_df)
        }

    def summary(self, df: pd.DataFrame, filters: dict | None = None) -> dict:
        filtered_df = self._prepare_filtered_df(df, filters)

        return self.summary_analysis.summary(filtered_df)
