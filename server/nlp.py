import torch
import pandas as pd
import numpy as np
from typing import Any

from transformers import pipeline
from sentence_transformers import SentenceTransformer


class NLP:
    _topic_models: dict[str, SentenceTransformer] = {}
    _emotion_classifiers: dict[str, Any] = {}
    _topic_embedding_cache: dict[tuple[str, ...], np.ndarray] = {}

    def __init__(
        self, df: pd.DataFrame, title_col: str, content_col: str, topics: dict
    ):
        self.df = df
        self.title_col = title_col
        self.content_col = content_col
        self.use_cuda = torch.cuda.is_available()
        self.device_str = "cuda" if self.use_cuda else "cpu"
        self.pipeline_device = 0 if self.use_cuda else -1

        if self.use_cuda:
            torch.set_float32_matmul_precision("high")

        try:
            self.topic_model = self._get_topic_model(self.device_str)
            self.emotion_classifier = self._get_emotion_classifier(
                self.device_str, self.pipeline_device
            )
        except RuntimeError as exc:
            if self.use_cuda and "out of memory" in str(exc).lower():
                torch.cuda.empty_cache()
                self.use_cuda = False
                self.device_str = "cpu"
                self.pipeline_device = -1
                self.topic_model = self._get_topic_model(self.device_str)
                self.emotion_classifier = self._get_emotion_classifier(
                    self.device_str, self.pipeline_device
                )
            else:
                raise

        self.topic_batch_size = 128 if self.use_cuda else 32
        self.emotion_batch_size = 96 if self.use_cuda else 16

        self.topic_labels = list(topics.keys())
        self.topic_texts = list(topics.values())

        cache_key = tuple(self.topic_texts)
        cached_embeddings = NLP._topic_embedding_cache.get(cache_key)

        if cached_embeddings is None:
            cached_embeddings = self._encode_with_backoff(
                self.topic_texts, self.topic_batch_size
            )
            NLP._topic_embedding_cache[cache_key] = cached_embeddings

        self.topic_embeddings = cached_embeddings

    @classmethod
    def _get_topic_model(cls, device_str: str) -> SentenceTransformer:
        model = cls._topic_models.get(device_str)
        if model is None:
            model = SentenceTransformer("all-mpnet-base-v2", device=device_str)
            cls._topic_models[device_str] = model
        return model

    @classmethod
    def _get_emotion_classifier(cls, device_str: str, pipeline_device: int) -> Any:
        classifier = cls._emotion_classifiers.get(device_str)
        if classifier is None:
            pipeline_kwargs = {
                "top_k": None,
                "truncation": True,
                "device": pipeline_device,
            }
            if device_str == "cuda":
                pipeline_kwargs["dtype"] = torch.float16

            classifier = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                **pipeline_kwargs,
            )
            cls._emotion_classifiers[device_str] = classifier
        return classifier

    def _encode_with_backoff(
        self, texts: list[str], initial_batch_size: int
    ) -> np.ndarray:
        batch_size = initial_batch_size
        while True:
            try:
                return self.topic_model.encode(
                    texts,
                    normalize_embeddings=True,
                    show_progress_bar=False,
                    batch_size=batch_size,
                    convert_to_numpy=True,
                )
            except RuntimeError as exc:
                if (
                    self.use_cuda
                    and "out of memory" in str(exc).lower()
                    and batch_size > 8
                ):
                    batch_size = max(8, batch_size // 2)
                    torch.cuda.empty_cache()
                    continue
                raise

    def _infer_emotions_with_backoff(
        self, texts: list[str], initial_batch_size: int
    ) -> list[list[dict[str, Any]]]:
        batch_size = initial_batch_size
        while True:
            try:
                return self.emotion_classifier(texts, batch_size=batch_size)
            except RuntimeError as exc:
                if (
                    self.use_cuda
                    and "out of memory" in str(exc).lower()
                    and batch_size > 8
                ):
                    batch_size = max(8, batch_size // 2)
                    torch.cuda.empty_cache()
                    continue
                raise

    def add_emotion_cols(self) -> None:
        texts = self.df[self.content_col].astype(str).str.slice(0, 512).tolist()

        if not texts:
            return

        results = self._infer_emotions_with_backoff(texts, self.emotion_batch_size)

        rows: list[dict[str, float]] = []
        for row in results:
            score_map: dict[str, float] = {}
            for item in row:
                label = item.get("label")
                score = item.get("score")
                if isinstance(label, str) and isinstance(score, (int, float)):
                    score_map[label] = float(score)
            rows.append(score_map)

        emotion_df = pd.DataFrame(rows).fillna(0.0).add_prefix("emotion_")
        for column in emotion_df.columns:
            self.df[column] = emotion_df[column].values

        for column in self.df.columns:
            if column.startswith("emotion_") and column not in emotion_df.columns:
                self.df[column] = 0.0

    def add_topic_col(self, confidence_threshold: float = 0.3) -> None:
        titles = self.df[self.title_col].fillna("").astype(str)
        contents = self.df[self.content_col].fillna("").astype(str)

        texts = [
            f"{title}. {content}" if title else content
            for title, content in zip(titles, contents)
        ]

        if not texts:
            self.df["topic"] = []
            self.df["topic_confidence"] = []
            return

        text_embeddings = self._encode_with_backoff(texts, self.topic_batch_size)

        # cosine similarity is a dot product for normalized vectors
        sims = np.matmul(text_embeddings, self.topic_embeddings.T)

        # Best match
        best_idx = sims.argmax(axis=1)
        best_score = sims[np.arange(len(sims)), best_idx]

        self.df["topic"] = [self.topic_labels[i] for i in best_idx]
        self.df["topic_confidence"] = best_score
        self.df.loc[self.df["topic_confidence"] < confidence_threshold, "topic"] = (
            "Misc"
        )
