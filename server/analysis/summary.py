import pandas as pd


class SummaryAnalysis:
    def total_events(self, df: pd.DataFrame) -> int:
        return int(len(df))

    def total_posts(self, df: pd.DataFrame) -> int:
        return int(len(df[df["type"] == "post"]))

    def total_comments(self, df: pd.DataFrame) -> int:
        return int(len(df[df["type"] == "comment"]))

    def unique_users(self, df: pd.DataFrame) -> int:
        return int(len(df["author"].dropna().unique()))

    def comments_per_post(self, total_comments: int, total_posts: int) -> float:
        return round(total_comments / max(total_posts, 1), 2)

    def lurker_ratio(self, df: pd.DataFrame) -> float:
        events_per_user = df.groupby("author").size()
        return round((events_per_user == 1).mean(), 2)

    def time_range(self, df: pd.DataFrame) -> dict:
        return {
            "start": int(df["dt"].min().timestamp()),
            "end": int(df["dt"].max().timestamp()),
        }

    def sources(self, df: pd.DataFrame) -> list:
        return df["source"].dropna().unique().tolist()

    def empty_summary(self) -> dict:
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

    def summary(self, df: pd.DataFrame) -> dict:
        if df.empty:
            return self.empty_summary()

        total_posts = self.total_posts(df)
        total_comments = self.total_comments(df)

        return {
            "total_events": self.total_events(df),
            "total_posts": total_posts,
            "total_comments": total_comments,
            "unique_users": self.unique_users(df),
            "comments_per_post": self.comments_per_post(total_comments, total_posts),
            "lurker_ratio": self.lurker_ratio(df),
            "time_range": self.time_range(df),
            "sources": self.sources(df),
        }
