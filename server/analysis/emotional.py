import pandas as pd

class EmotionalAnalysis:
    def __init__(self, df: pd.DataFrame):
        self.df = df

    def avg_emotion_by_topic(self) -> dict:
        emotion_exclusions = [
            "emotion_neutral",
            "emotion_surprise"
        ]

        emotion_cols = [
            col for col in self.df.columns
            if col.startswith("emotion_") and col not in emotion_exclusions
        ]

        counts = (
            self.df[
                (self.df["topic"] != "Misc")
            ]
            .groupby("topic")
            .size()
            .rename("n")
        )

        avg_emotion_by_topic = (
            self.df[
                (self.df["topic"] != "Misc")
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