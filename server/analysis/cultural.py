import pandas as pd
import re

from collections import Counter
from typing import Any


class CulturalAnalysis:
    def __init__(self, content_col: str = "content", topic_col: str = "topic"):
        self.content_col = content_col
        self.topic_col = topic_col

    def get_identity_markers(self, original_df: pd.DataFrame) -> dict[str, Any]:
        df = original_df.copy()
        s = df[self.content_col].fillna("").astype(str).str.lower()

        in_group_words = {"we", "us", "our", "ourselves"}
        out_group_words = {"they", "them", "their", "themselves"}

        emotion_exclusions = {"emotion_neutral", "emotion_surprise"}
        emotion_cols = [
            c for c in df.columns
            if c.startswith("emotion_") and c not in emotion_exclusions
        ]

        # Tokenize per row
        tokens_per_row = s.apply(lambda txt: re.findall(r"\b[a-z]{2,}\b", txt))

        total_tokens = int(tokens_per_row.map(len).sum())
        in_hits = tokens_per_row.map(lambda toks: sum(t in in_group_words for t in toks)).astype(int)
        out_hits = tokens_per_row.map(lambda toks: sum(t in out_group_words for t in toks)).astype(int)

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

        hedges = {
            "maybe", "perhaps", "possibly", "probably", "likely", "seems", "seem",
            "i think", "i feel", "i guess", "kind of", "sort of", "somewhat"
        }
        certainty = {
            "definitely", "certainly", "clearly", "obviously", "undeniably", "always", "never"
        }

        deontic = {
            "must", "should", "need", "needs", "have to", "has to", "ought", "required", "require"
        }

        permission = {"can", "allowed", "okay", "ok", "permitted"}

        def count_phrases(text: str, phrases: set[str]) -> int:
            c = 0
            for p in phrases:
                if " " in p:
                    c += len(re.findall(r"\b" + re.escape(p) + r"\b", text))
                else:
                    c += len(re.findall(r"\b" + re.escape(p) + r"\b", text))
            return c

        hedge_counts = s.apply(lambda t: count_phrases(t, hedges))
        certainty_counts = s.apply(lambda t: count_phrases(t, certainty))
        deontic_counts = s.apply(lambda t: count_phrases(t, deontic))
        perm_counts = s.apply(lambda t: count_phrases(t, permission))

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
        entity_counter = Counter()

        for row in df["entities"].dropna():
            if isinstance(row, list):
                for ent in row:
                    if isinstance(ent, dict):
                        text = ent.get("text")
                        if isinstance(text, str):
                            text = text.strip()
                            if len(text) >= 3:  # filter short junk
                                entity_counter[text] += 1

        top_entities = entity_counter.most_common(top_n)

        entity_emotion_avg = {}

        for entity_text, _ in top_entities:
            mask = df["entities"].apply(
                lambda ents: isinstance(ents, list) and
                any(isinstance(e, dict) and e.get("text") == entity_text for e in ents)
            )

            post_count = int(mask.sum())

            if post_count >= min_posts:
                emo_means = (
                    df.loc[mask, emotion_cols]
                    .apply(pd.to_numeric, errors="coerce")
                    .fillna(0.0)
                    .mean()
                    .to_dict()
                )

                entity_emotion_avg[entity_text] = {
                    "post_count": post_count,
                    "emotion_avg": emo_means
                }

        return {
            "entity_emotion_avg": entity_emotion_avg
        }