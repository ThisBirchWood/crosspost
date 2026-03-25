import pandas as pd
import re


class InteractionAnalysis:
    def __init__(self, word_exclusions: set[str]):
        self.word_exclusions = word_exclusions

    def _tokenize(self, text: str):
        tokens = re.findall(r"\b[a-z]{3,}\b", text)
        return [t for t in tokens if t not in self.word_exclusions]

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

    def top_interaction_pairs(self, df: pd.DataFrame, top_n=10):
        graph = self.interaction_graph(df)
        pairs = []

        for a, targets in graph.items():
            for b, count in targets.items():
                pairs.append(((a, b), count))

        pairs.sort(key=lambda x: x[1], reverse=True)
        return pairs[:top_n]

    def conversation_concentration(self, df: pd.DataFrame) -> dict:
        if "type" not in df.columns:
            return {}

        comments = df[df["type"] == "comment"]
        if comments.empty:
            return {}

        author_counts = comments["author"].value_counts()
        total_comments = len(comments)
        total_authors = len(author_counts)

        top_10_pct_n = max(1, int(total_authors * 0.1))
        top_10_pct_share = round(
            author_counts.head(top_10_pct_n).sum() / total_comments, 4
        )

        return {
            "total_commenting_authors": total_authors,
            "top_10pct_author_count": top_10_pct_n,
            "top_10pct_comment_share": float(top_10_pct_share),
            "single_comment_authors": int((author_counts == 1).sum()),
            "single_comment_author_ratio": float(
                round((author_counts == 1).sum() / total_authors, 4)
            ),
        }
