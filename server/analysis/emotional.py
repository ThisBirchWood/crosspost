import pandas as pd


class EmotionalAnalysis:
    def _emotion_cols(self, df: pd.DataFrame) -> list[str]:
        return [col for col in df.columns if col.startswith("emotion_")]

    def avg_emotion_by_topic(self, df: pd.DataFrame) -> list[dict]:
        emotion_cols = self._emotion_cols(df)

        if not emotion_cols:
            return []

        counts = (
            df[(df["topic"] != "Misc")].groupby("topic").size().reset_index(name="n")
        )

        avg_emotion_by_topic = (
            df[(df["topic"] != "Misc")]
            .groupby("topic")[emotion_cols]
            .mean()
            .reset_index()
        )

        avg_emotion_by_topic = avg_emotion_by_topic.merge(counts, on="topic")

        return avg_emotion_by_topic.to_dict(orient="records")

    def overall_emotion_average(self, df: pd.DataFrame) -> list[dict]:
        emotion_cols = self._emotion_cols(df)

        if not emotion_cols:
            return []

        means = df[emotion_cols].mean()
        return [
            {
                "emotion": col.replace("emotion_", ""),
                "score": float(means[col]),
            }
            for col in emotion_cols
        ]

    def dominant_emotion_distribution(self, df: pd.DataFrame) -> list[dict]:
        emotion_cols = self._emotion_cols(df)

        if not emotion_cols or df.empty:
            return []

        dominant_per_row = df[emotion_cols].idxmax(axis=1)
        counts = dominant_per_row.value_counts()
        total = max(len(dominant_per_row), 1)

        return [
            {
                "emotion": col.replace("emotion_", ""),
                "count": int(count),
                "ratio": round(float(count / total), 4),
            }
            for col, count in counts.items()
        ]

    def emotion_by_source(self, df: pd.DataFrame) -> list[dict]:
        emotion_cols = self._emotion_cols(df)

        if not emotion_cols or "source" not in df.columns or df.empty:
            return []

        source_counts = df.groupby("source").size()
        source_means = df.groupby("source")[emotion_cols].mean().reset_index()
        rows = source_means.to_dict(orient="records")
        output = []

        for row in rows:
            source = row["source"]
            dominant_col = max(emotion_cols, key=lambda col: float(row.get(col, 0)))
            output.append(
                {
                    "source": str(source),
                    "dominant_emotion": dominant_col.replace("emotion_", ""),
                    "dominant_score": round(float(row.get(dominant_col, 0)), 4),
                    "event_count": int(source_counts.get(source, 0)),
                }
            )

        return output
