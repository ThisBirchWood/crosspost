import pandas as pd
import re

from typing import Any


class CulturalAnalysis:
    def __init__(self, content_col: str = "content", topic_col: str = "topic"):
        self.content_col = content_col
        self.topic_col = topic_col

    def get_identity_markers(self, original_df: pd.DataFrame) -> dict[str, Any]:
        df = original_df.copy()
        s = df[self.content_col].fillna("").astype(str).str.lower()

        emotion_exclusions = {"emotion_neutral", "emotion_surprise"}
        emotion_cols = [
            c for c in df.columns
            if c.startswith("emotion_") and c not in emotion_exclusions
        ]

        # Tokenize per row
        in_pattern = re.compile(r"\b(we|us|our|ourselves)\b")
        out_pattern = re.compile(r"\b(they|them|their|themselves)\b")
        token_pattern = re.compile(r"\b[a-z]{2,}\b")

        in_hits = s.str.count(in_pattern)
        out_hits = s.str.count(out_pattern)
        total_tokens = s.str.count(token_pattern).sum()

        in_count = int(in_hits.sum())
        out_count = int(out_hits.sum())

        in_mask = in_hits > out_hits
        out_mask = out_hits > in_hits
        tie_mask = ~(in_mask | out_mask)

        result = {
            "in_group_usage": in_count,
            "out_group_usage": out_count,
            "in_group_ratio": round(in_count / max(total_tokens, 1), 5),
            "out_group_ratio": round(out_count / max(total_tokens, 1), 5),

            "in_group_posts": int(in_mask.sum()),
            "out_group_posts": int(out_mask.sum()),
            "tie_posts": int(tie_mask.sum()),
        }

        if emotion_cols:
            emo = df[emotion_cols].apply(pd.to_numeric, errors="coerce").fillna(0.0)

            in_avg = emo.loc[in_mask].mean() if in_mask.any() else pd.Series(0.0, index=emotion_cols)
            out_avg = emo.loc[out_mask].mean() if out_mask.any() else pd.Series(0.0, index=emotion_cols)

            result["in_group_emotion_avg"] = in_avg.to_dict()
            result["out_group_emotion_avg"] = out_avg.to_dict()

        return result
    
    def get_stance_markers(self, df: pd.DataFrame) -> dict[str, Any]:
        s = df[self.content_col].fillna("").astype(str)

        hedge_pattern = re.compile(r"\b(maybe|perhaps|possibly|probably|likely|seems|seem|i think|i feel|i guess|kind of|sort of|somewhat)\b")
        certainty_pattern = re.compile(r"\b(definitely|certainly|clearly|obviously|undeniably|always|never)\b")
        deontic_pattern = re.compile(r"\b(must|should|need|needs|have to|has to|ought|required|require)\b")
        permission_pattern = re.compile(r"\b(can|allowed|okay|ok|permitted)\b")

        hedge_counts = s.str.count(hedge_pattern)
        certainty_counts = s.str.count(certainty_pattern)
        deontic_counts = s.str.count(deontic_pattern)
        perm_counts = s.str.count(permission_pattern)

        token_counts = s.apply(lambda t: len(re.findall(r"\b[a-z]{2,}\b", t))).replace(0, 1)

        return {
            "hedge_total": int(hedge_counts.sum()),
            "certainty_total": int(certainty_counts.sum()),
            "deontic_total": int(deontic_counts.sum()),
            "permission_total": int(perm_counts.sum()),
            "hedge_per_1k_tokens": round(1000 * hedge_counts.sum() / token_counts.sum(), 3),
            "certainty_per_1k_tokens": round(1000 * certainty_counts.sum() / token_counts.sum(), 3),
            "deontic_per_1k_tokens": round(1000 * deontic_counts.sum() / token_counts.sum(), 3),
            "permission_per_1k_tokens": round(1000 * perm_counts.sum() / token_counts.sum(), 3),
        }
    
    def get_avg_emotions_per_entity(self, df: pd.DataFrame, top_n: int = 25, min_posts: int = 10) -> dict[str, Any]:
        if "entities" not in df.columns:
            return {"entity_emotion_avg": {}}

        emotion_cols = [c for c in df.columns if c.startswith("emotion_")]

        entity_df = df[["entities"] + emotion_cols].explode("entities")

        entity_df["entity_text"] = entity_df["entities"].apply(
            lambda e: e.get("text").strip()
            if isinstance(e, dict) and isinstance(e.get("text"), str) and len(e.get("text")) >= 3
            else None
        )

        entity_df = entity_df.dropna(subset=["entity_text"])
        entity_counts = entity_df["entity_text"].value_counts().head(top_n)
        entity_emotion_avg = {}

        for entity_text, count in entity_counts.items():
            if count >= min_posts:
                emo_means = (
                    entity_df[entity_df["entity_text"] == entity_text][emotion_cols]
                    .mean()
                    .to_dict()
                )

                entity_emotion_avg[entity_text] = {
                    "post_count": int(count),
                    "emotion_avg": emo_means,
                }

        return {"entity_emotion_avg": entity_emotion_avg}