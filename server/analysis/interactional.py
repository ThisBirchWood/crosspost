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

    def _vocab_richness_per_user(
        self, min_words: int = 20, top_most_used_words: int = 100
    ) -> list:
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

            rows.append(
                {
                    "author": author,
                    "events": int(events),
                    "total_words": int(total_words),
                    "unique_words": int(unique_words),
                    "vocab_richness": round(vocab_richness, 3),
                    "avg_words_per_event": round(avg_words, 2),
                    "top_words": top_words,
                }
            )

        rows = sorted(rows, key=lambda x: x["vocab_richness"], reverse=True)

        return rows

    def top_users(self) -> list:
        counts = (
            self.df.groupby(["author", "source"]).size().sort_values(ascending=False)
        )

        top_users = [
            {"author": author, "source": source, "count": int(count)}
            for (author, source), count in counts.items()
        ]

        return top_users

    def per_user_analysis(self) -> dict:
        per_user = self.df.groupby(["author", "type"]).size().unstack(fill_value=0)

        emotion_cols = [col for col in self.df.columns if col.startswith("emotion_")]

        avg_emotions_by_author = {}
        if emotion_cols:
            avg_emotions = self.df.groupby("author")[emotion_cols].mean().fillna(0.0)
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

        vocab_rows = self._vocab_richness_per_user()
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
                    "vocab": vocab_by_author.get(author, {"vocab_richness": 0, "avg_words_per_event": 0, "top_words": []}),
                }
            )

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

    def average_thread_depth(self):
        depths = []
        id_to_reply = self.df.set_index("id")["reply_to"].to_dict()
        for _, row in self.df.iterrows():
            depth = 0
            current_id = row["id"]

            while True:
                reply_to = id_to_reply.get(current_id)
                if pd.isna(reply_to) or reply_to == "":
                    break

                depth += 1
                current_id = reply_to

            depths.append(depth)

        if not depths:
            return 0

        return round(sum(depths) / len(depths), 2)

    def average_thread_length_by_emotion(self):
        emotion_exclusions = {"emotion_neutral", "emotion_surprise"}

        emotion_cols = [
            c
            for c in self.df.columns
            if c.startswith("emotion_") and c not in emotion_exclusions
        ]

        id_to_reply = self.df.set_index("id")["reply_to"].to_dict()
        length_cache = {}

        def thread_length_from(start_id):
            if start_id in length_cache:
                return length_cache[start_id]

            seen = set()
            length = 1
            current = start_id

            while True:
                if current in seen:
                    # infinite loop shouldn't happen, but just in case
                    break
                seen.add(current)

                reply_to = id_to_reply.get(current)

                if (
                    reply_to is None
                    or (isinstance(reply_to, float) and pd.isna(reply_to))
                    or reply_to == ""
                ):
                    break

                length += 1
                current = reply_to

                if current in length_cache:
                    length += length_cache[current] - 1
                    break

            length_cache[start_id] = length
            return length

        emotion_to_lengths = {}

        # Fill NaNs in emotion cols to avoid max() issues
        emo_df = self.df[["id"] + emotion_cols].copy()
        emo_df[emotion_cols] = emo_df[emotion_cols].fillna(0)

        for _, row in emo_df.iterrows():
            msg_id = row["id"]
            length = thread_length_from(msg_id)

            emotions = {c: row[c] for c in emotion_cols}
            dominant = max(emotions, key=emotions.get)

            emotion_to_lengths.setdefault(dominant, []).append(length)

        return {
            emotion: round(sum(lengths) / len(lengths), 2)
            for emotion, lengths in emotion_to_lengths.items()
        }
