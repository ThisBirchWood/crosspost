import pandas as pd

class TemporalAnalysis:
    def __init__(self, df: pd.DataFrame):
        self.df = df
  
    def avg_reply_time_per_emotion(self) -> dict:
        df = self.df.copy()

        replies = df[
            (df["type"] == "comment") &
            (df["reply_to"].notna()) &
            (df["reply_to"] != "")
        ]

        id_to_time = df.set_index("id")["dt"].to_dict()

        def compute_reply_time(row):
            reply_id = row["reply_to"]
            parent_time = id_to_time.get(reply_id)

            if parent_time is None:
                return None

            return (row["dt"] - parent_time).total_seconds()
        
        replies["reply_time"] = replies.apply(compute_reply_time, axis=1)
        emotion_cols = [col for col in df.columns if col.startswith("emotion_") and col not in ("emotion_neutral", "emotion_surprise")]
        replies["dominant_emotion"] = replies[emotion_cols].idxmax(axis=1)
        
        grouped = (
            replies
            .groupby("dominant_emotion")["reply_time"]
            .agg(["mean", "count"])
            .reset_index()
        )

        return grouped.to_dict(orient="records")
    
    def posts_per_day(self) -> dict:
        per_day = (
            self.df.groupby("date")
            .size()
            .reset_index(name="count")
        )

        return per_day.to_dict(orient="records")
    
    def heatmap(self) -> dict:
        weekday_order = [
            "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday", "Sunday"
        ]

        self.df["weekday"] = pd.Categorical(
            self.df["weekday"],
            categories=weekday_order,
            ordered=True
        )

        heatmap = (
            self.df
            .groupby(["weekday", "hour"], observed=True)
            .size()
            .unstack(fill_value=0)
            .reindex(columns=range(24), fill_value=0)
        )

        heatmap.columns = heatmap.columns.map(str)
        return heatmap.to_dict(orient="records")