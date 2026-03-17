import pandas as pd


class UserAnalysis:
    def top_users(self, df: pd.DataFrame) -> list:
        counts = df.groupby(["author", "source"]).size().sort_values(ascending=False)

        top_users = [
            {"author": author, "source": source, "count": int(count)}
            for (author, source), count in counts.items()
        ]

        return top_users

    def per_user_analysis(self, df: pd.DataFrame) -> dict:
        per_user = df.groupby(["author", "type"]).size().unstack(fill_value=0)

        emotion_cols = [col for col in df.columns if col.startswith("emotion_")]

        avg_emotions_by_author = {}
        if emotion_cols:
            avg_emotions = df.groupby("author")[emotion_cols].mean().fillna(0.0)
            avg_emotions_by_author = {
                author: {emotion: float(score) for emotion, score in row.items()}
                for author, row in avg_emotions.iterrows()
            }

        # ensure columns always exist
        for col in ("post", "comment"):
            if col not in per_user.columns:
                per_user[col] = 0

        per_user["comment_post_ratio"] = per_user["comment"] / per_user["post"].replace(
            0, 1
        )
        per_user["comment_share"] = per_user["comment"] / (
            per_user["post"] + per_user["comment"]
        ).replace(0, 1)
        per_user = per_user.sort_values("comment_post_ratio", ascending=True)
        per_user_records = per_user.reset_index().to_dict(orient="records")

        vocab_rows = self._vocab_richness_per_user(df)
        vocab_by_author = {row["author"]: row for row in vocab_rows}

        # merge vocab richness + per_user information
        merged_users = []
        for row in per_user_records:
            author = row["author"]
            merged_users.append(
                {
                    "author": author,
                    "post": int(row.get("post", 0)),
                    "comment": int(row.get("comment", 0)),
                    "comment_post_ratio": float(row.get("comment_post_ratio", 0)),
                    "comment_share": float(row.get("comment_share", 0)),
                    "avg_emotions": avg_emotions_by_author.get(author, {}),
                    "vocab": vocab_by_author.get(
                        author,
                        {
                            "vocab_richness": 0,
                            "avg_words_per_event": 0,
                            "top_words": [],
                        },
                    ),
                }
            )

        merged_users.sort(key=lambda u: u["comment_post_ratio"])

        return merged_users
