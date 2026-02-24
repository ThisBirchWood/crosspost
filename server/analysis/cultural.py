import pandas as pd
import re

class CulturalAnalysis:
    def __init__(self, df: pd.DataFrame):
        self.df = df

    def get_identity_markers(self):
        df = self.df.copy()
        s = df["content"].fillna("").astype(str).str.lower()

        in_group_words = {"we", "us", "our", "ourselves"}
        out_group_words = {"they", "them", "their", "themselves"}

        emotion_exclusions = {"emotion_neutral", "emotion_surprise"}
        emotion_cols = [c for c in df.columns if c.startswith("emotion_") and c not in emotion_exclusions]

        # token counts per row
        tokens_per_row = s.apply(lambda txt: re.findall(r"\b[a-z]{2,}\b", txt))

        total_tokens = int(tokens_per_row.map(len).sum())
        in_hits = tokens_per_row.map(lambda toks: sum(t in in_group_words for t in toks))
        out_hits = tokens_per_row.map(lambda toks: sum(t in out_group_words for t in toks))

        in_count = int(in_hits.sum())
        out_count = int(out_hits.sum())

        result = {
            "in_group_usage": in_count,
            "out_group_usage": out_count,
            "in_group_ratio": round(in_count / max(total_tokens, 1), 5),
            "out_group_ratio": round(out_count / max(total_tokens, 1), 5),
        }

        if emotion_cols:
            emo = df[emotion_cols].fillna(0).astype(float)
            result["in_group_emotion_sums"] = emo[in_hits > out_hits].sum().to_dict()
            result["out_group_emotion_sums"] = emo[out_hits > in_hits].sum().to_dict()

        return result