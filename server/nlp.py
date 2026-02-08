import torch
import pandas as pd

from transformers import pipeline
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

class NLP:
    def __init__(self, df: pd.DataFrame, title_col: str, content_col: str, topics: dict):
        self.df = df
        self.title_col = title_col
        self.content_col = content_col
        self.device = 0 if torch.cuda.is_available() else 1
        
        # Topic model
        self.topic_model = SentenceTransformer("all-mpnet-base-v2", device=self.device)

        self.topic_labels = list(topics.keys())
        self.topic_texts = list(topics.values())

        self.topic_embeddings = self.topic_model.encode(
            self.topic_texts,
            normalize_embeddings=True,
        )

        # emotion model
        self.emotion_classifier = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None,
            truncation=True,
            device=self.device
        )

    def add_emotion_cols(self) -> None:
        texts = self.df[self.content_col].astype(str).str.slice(0, 512).tolist()

        results = self.emotion_classifier(
            texts,
            batch_size=64
        )

        labels = [r["label"] for r in results[0]]

        for label in labels:
            self.df[f"emotion_{label}"] = [
                next(item["score"] for item in row if item["label"] == label)
                for row in results
            ]

    def add_topic_col(self, confidence_threshold: float = 0.3) -> None:
        titles = self.df[self.title_col].fillna("").astype(str)
        contents = self.df[self.content_col].fillna("").astype(str)

        texts = [
            f"{title}. {content}" if title else content
            for title, content in zip(titles, contents)
        ]

        text_embeddings = self.topic_model.encode(
            texts,
            normalize_embeddings=True,
        )

        # Similarity
        sims = cosine_similarity(text_embeddings, self.topic_embeddings)

        # Best match
        best_idx = sims.argmax(axis=1)
        best_score = sims.max(axis=1)

        self.df["topic"] = [self.topic_labels[i] for i in best_idx]
        self.df["topic_confidence"] = best_score
        self.df.loc[self.df["topic_confidence"] < confidence_threshold, "topic"] = "Misc"