import pandas as pd

class EmotionalAnalysis:
    def avg_emotion_by_topic(self, df: pd.DataFrame) -> dict:
        emotion_cols = [
            col for col in df.columns
            if col.startswith("emotion_")
        ]

        counts = (
            df[
                (df["topic"] != "Misc")
            ]
            .groupby("topic")
            .size()
            .rename("n")
        )

        avg_emotion_by_topic = (
            df[
                (df["topic"] != "Misc")
            ]
            .groupby("topic")[emotion_cols]
            .mean()
            .reset_index()
        )

        avg_emotion_by_topic = avg_emotion_by_topic.merge(
            counts,
            on="topic"
        )

        return avg_emotion_by_topic.to_dict(orient='records')