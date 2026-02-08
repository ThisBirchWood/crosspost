import torch
import pandas as pd

from transformers import pipeline
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


model = SentenceTransformer("all-mpnet-base-v2", device=0 if torch.cuda.is_available() else 1)

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
        title_col: str,
        content_col: str,
        domain_topics: dict,
        confidence_threshold: float = 0.20
    ) -> None:

    topic_labels = list(domain_topics.keys())
    topic_texts = list(domain_topics.values())

    topic_embeddings = model.encode(
        topic_texts,
        normalize_embeddings=True,
    )

    titles = df[title_col].fillna("").astype(str)
    contents = df[content_col].fillna("").astype(str)

    texts = [
        f"{title}. {content}" if title else content
        for title, content in zip(titles, contents)
    ]

    text_embeddings = model.encode(
        texts,
        normalize_embeddings=True,
    )

    # Similarity
    sims = cosine_similarity(text_embeddings, topic_embeddings)

    # Best match
    best_idx = sims.argmax(axis=1)
    best_score = sims.max(axis=1)

    df["topic"] = [topic_labels[i] for i in best_idx]
    df["topic_confidence"] = best_score

    df.loc[df["topic_confidence"] < confidence_threshold, "topic"] = "Misc"

    return df