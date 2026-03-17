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
    
    def initiator_ratio(self, df: pd.DataFrame):
        starters = df["reply_to"].isna().sum()
        total = len(df)

        if total == 0:
            return 0

        return round(starters / total, 2)
