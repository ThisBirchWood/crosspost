import torch
import pandas as pd

from transformers import pipeline

emotion_classifier = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=None,
    truncation=True,
    device=0 if torch.cuda.is_available() else -1
)

def add_emotion_cols(df: pd.Dataframe, content_col: str) -> None:
    texts = df[content_col].astype(str).str.slice(0, 512).tolist()

    results = emotion_classifier(
        texts,
        batch_size=64
    )

    labels = [r["label"] for r in results[0]]

    for label in labels:
        df[f"emotion_{label}"] = [
            next(item["score"] for item in row if item["label"] == label)
            for row in results
        ]