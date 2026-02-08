import torch
import pandas as pd
import numpy as np

from transformers import pipeline
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


model = SentenceTransformer("all-MiniLM-L6-v2", device=0 if torch.cuda.is_available() else 1)

def add_emotion_cols(
        df: pd.DataFrame, 
        content_col: str
    ) -> None:
    emotion_classifier = pipeline(
        "text-classification",
        model="j-hartmann/emotion-english-distilroberta-base",
        top_k=None,
        truncation=True,
        device=0 if torch.cuda.is_available() else -1
    )

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

def add_topic_col(
        df: pd.DataFrame,
        content_col: str,
        domain_topics: list[str],
        confidence_threshold: float = 0.15
    ) -> None:
    topic_embeddings = model.encode(
        domain_topics,
        normalize_embeddings=True,
    )

    texts = df[content_col].astype(str).tolist()
    text_embeddings = model.encode(
        texts,
        normalize_embeddings=True,
    )

    # Similarity
    sims = cosine_similarity(text_embeddings, topic_embeddings)

    # Best match
    best_idx = sims.argmax(axis=1)
    best_score = sims.max(axis=1)

    df["topic"] = [domain_topics[i] for i in best_idx]
    df["topic_confidence"] = best_score
    df.loc[df["topic_confidence"] < confidence_threshold, "topic"] = "Misc"

    return df