import torch
import pandas as pd

from transformers import pipeline
from keybert import KeyBERT

kw_model = KeyBERT(model="all-MiniLM-L6-v2")

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

def add_topic_col(df: pd.DataFrame, content_col: str, top_n: int = 3) -> None:
    topics = []

    for text in df["content"].astype(str):
        keywords = kw_model.extract_keywords(
            text,
            keyphrase_ngram_range=(1, 3),
            stop_words="english",
            top_n=top_n
        )

        topics.append([kw for kw, _ in keywords])

    df["topics"] = topics