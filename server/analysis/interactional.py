import pandas as pd
import re

from collections import Counter


class InteractionAnalysis:
    def __init__(self, word_exclusions: set[str]):
        self.word_exclusions = word_exclusions

    def _tokenize(self, text: str):
        tokens = re.findall(r"\b[a-z]{3,}\b", text)
        return [t for t in tokens if t not in self.word_exclusions]

    def _vocab_richness_per_user(
        self, df: pd.DataFrame, min_words: int = 20, top_most_used_words: int = 100
    ) -> list:
        df = df.copy()
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

    def interaction_graph(self, df: pd.DataFrame):
        interactions = {a: {} for a in df["author"].dropna().unique()}

        # reply_to refers to the comment id, this allows us to map comment/post ids to usernames
        id_to_author = df.set_index("post_id")["author"].to_dict()

        for _, row in df.iterrows():
            a = row["author"]
            reply_id = row["reply_to"]

            if pd.isna(a) or pd.isna(reply_id) or reply_id == "":
                continue

            b = id_to_author.get(reply_id)
            if b is None or a == b:
                continue

            interactions[a][b] = interactions[a].get(b, 0) + 1

        return interactions

    def average_thread_depth(self, df: pd.DataFrame):
        depths = []
        id_to_reply = df.set_index("id")["reply_to"].to_dict()
        for _, row in df.iterrows():
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

    def average_thread_length_by_emotion(self, df: pd.DataFrame):
        emotion_exclusions = {"emotion_neutral", "emotion_surprise"}

        emotion_cols = [
            c
            for c in df.columns
            if c.startswith("emotion_") and c not in emotion_exclusions
        ]

        id_to_reply = df.set_index("id")["reply_to"].to_dict()
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
        emo_df = df[["id"] + emotion_cols].copy()
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
