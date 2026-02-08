import torch
import pandas as pd

from transformers import pipeline
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer

sentence_model = SentenceTransformer("all-MiniLM-L6-v2", device="cuda")

def add_emotion_cols(df: pd.DataFrame, content_col: str) -> None:
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

def add_topic_col(df: pd.DataFrame, content_col: str):
    kw_model = KeyBERT(model=sentence_model)

    texts = df[content_col].fillna("").astype(str).tolist()
    
    raw_results = kw_model.extract_keywords(
        texts, 
        keyphrase_ngram_range=(1, 1), 
        stop_words='english', 
        top_n=1
    )

    df['theme'] = [res[0][0] if len(res) > 0 else None for res in raw_results]