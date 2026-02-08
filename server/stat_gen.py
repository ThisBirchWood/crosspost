import pandas as pd
import re
import nltk
import datetime

from nltk.corpus import stopwords
from collections import Counter
from server.nlp import NLP

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
    def __init__(self, posts_df: pd.DataFrame, comments_df: pd.DataFrame, domain_topics: dict) -> None:
        posts_df["type"] = "post"
        posts_df["parent_id"] = None

        comments_df["type"] = "comment"
        comments_df["parent_id"] = comments_df.get("post_id")
        self.domain_topics = domain_topics

        self.df = pd.concat([posts_df, comments_df])
        self.nlp = NLP(self.df, "title", "content", domain_topics)
        self._add_extra_cols(self.df)

        self.original_df = self.df.copy(deep=True)

    ## Private Methods
    def _add_extra_cols(self, df: pd.DataFrame) -> None:
        df['date'] = pd.to_datetime(df['timestamp'], unit='s').dt.date
        df["dt"] = pd.to_datetime(df["timestamp"], unit="s", utc=True)
        df["hour"] = df["dt"].dt.hour
        df["weekday"] = df["dt"].dt.day_name()
        
        self.nlp.add_emotion_cols()
        self.nlp.add_topic_col()

    def _tokenize(self, text: str):
        tokens = re.findall(r"\b[a-z]{3,}\b", text)
        return [t for t in tokens if t not in EXCLUDE_WORDS]

    def _vocab_richness_per_user(self, min_words: int = 20, top_most_used_words: int = 100) -> list:
        df = self.df.copy()
        df["content"] = df["content"].fillna("").astype(str).str.lower()
        df["tokens"] = df["content"].apply(self._tokenize)

        rows = []
        for author, group in df.groupby("author"):
            all_tokens = [t for tokens in group["tokens"] for t in tokens]

            total_words = len(all_tokens)
            unique_words = len(set(all_tokens))
            events = len(group)

            # Min amount of words for a user, any less than this might give weird results
            if total_words < min_words:
                continue

            # 100% = they never reused a word (excluding stop words)
            vocab_richness = unique_words / total_words
            avg_words = total_words / max(events, 1)

            counts = Counter(all_tokens)
            top_words = [
                {"word": w, "count": int(c)}
                for w, c in counts.most_common(top_most_used_words)
            ]

            rows.append({
                "author": author,
                "events": int(events),
                "total_words": int(total_words),
                "unique_words": int(unique_words),
                "vocab_richness": round(vocab_richness, 3),
                "avg_words_per_event": round(avg_words, 2),
                "top_words": top_words
            })

        rows = sorted(rows, key=lambda x: x["vocab_richness"], reverse=True)

        return rows
    
    def _interaction_graph(self):
        interactions = {a: {} for a in self.df["author"].dropna().unique()}

        # reply_to refers to the comment id, this allows us to map comment ids to usernames
        id_to_author = self.df.set_index("id")["author"].to_dict()

        for _, row in self.df.iterrows():
            a = row["author"]
            reply_id = row["reply_to"]

            if pd.isna(a) or pd.isna(reply_id) or reply_id == "":
                continue

            b = id_to_author.get(reply_id)
            if b is None or a == b:
                continue

            interactions[a][b] = interactions[a].get(b, 0) + 1

        return interactions
        
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

        emotion_exclusions = [
            "emotion_neutral",
            "emotion_surprise"
        ]

        emotion_cols = [
            col for col in self.df.columns
            if col.startswith("emotion_") and col not in emotion_exclusions
        ]

        counts = (
            self.df[
                (self.df["topic"] != "Misc")
            ]
            .groupby("topic")
            .size()
            .rename("n")
        )

        avg_emotion_by_topic = (
            self.df[
                (self.df["topic"] != "Misc")
            ]
            .groupby("topic")[emotion_cols]
            .mean()
            .reset_index()
        )

        avg_emotion_by_topic = avg_emotion_by_topic.merge(
            counts,
            on="topic"
        )

        return {
            "word_frequencies": word_frequencies.to_dict(orient='records'),
            "average_emotion_by_topic": avg_emotion_by_topic.to_dict(orient='records')
        }
    
    def user_analysis(self) -> dict:
        counts = (
            self.df.groupby(["author", "source"])
            .size()
            .sort_values(ascending=False)
        )

        top_users = [
            {"author": author, "source": source, "count": int(count)}
            for (author, source), count in counts.items()
        ]

        per_user = (
            self.df.groupby(["author", "type"])
            .size()
            .unstack(fill_value=0)
        )

        # ensure columns always exist
        for col in ("post", "comment"):
            if col not in per_user.columns:
                per_user[col] = 0

        per_user["comment_post_ratio"] = per_user["comment"] / per_user["post"].replace(0, 1)
        per_user["comment_share"] = per_user["comment"] / (per_user["post"] + per_user["comment"]).replace(0, 1)
        per_user = per_user.sort_values("comment_post_ratio", ascending=True)
        per_user_records = per_user.reset_index().to_dict(orient="records")

        vocab_rows = self._vocab_richness_per_user()
        vocab_by_author = {row["author"]: row for row in vocab_rows}

        # merge vocab richness + per_user information
        merged_users = []
        for row in per_user_records:
            author = row["author"]
            merged_users.append({
                "author": author,
                "post": int(row.get("post", 0)),
                "comment": int(row.get("comment", 0)),
                "comment_post_ratio": float(row.get("comment_post_ratio", 0)),
                "comment_share": float(row.get("comment_share", 0)),
                "vocab": vocab_by_author.get(author)
            })

        merged_users.sort(key=lambda u: u["comment_post_ratio"])

        return {
            "top_users": top_users,
            "users": merged_users,
            "interaction_graph": self._interaction_graph()
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

