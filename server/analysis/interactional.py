import pandas as pd
import re

from collections import Counter

class InteractionAnalysis:
    def __init__(self, df: pd.DataFrame, word_exclusions: set[str]):
        self.df = df
        self.word_exclusions = word_exclusions

    def _tokenize(self, text: str):
        tokens = re.findall(r"\b[a-z]{3,}\b", text)
        return [t for t in tokens if t not in self.word_exclusions]

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

    def top_users(self) -> list:
        counts = (
            self.df.groupby(["author", "source"])
            .size()
            .sort_values(ascending=False)
        )

        top_users = [
            {"author": author, "source": source, "count": int(count)}
            for (author, source), count in counts.items()
        ]

        return top_users
    
    def per_user_analysis(self) -> dict:
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

        return merged_users
    
    def interaction_graph(self):
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