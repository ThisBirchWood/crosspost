import pandas as pd
import re

from collections import Counter
from itertools import islice


class LinguisticAnalysis:
    def __init__(self, word_exclusions: set[str]):
        self.word_exclusions = word_exclusions

    def _tokenize(self, text: str):
        tokens = re.findall(r"\b[a-z]{3,}\b", text)
        return [t for t in tokens if t not in self.word_exclusions]

    def _clean_text(self, text: str) -> str:
        text = re.sub(r"http\S+", "", text)  # remove URLs
        text = re.sub(r"www\S+", "", text)
        text = re.sub(r"&\w+;", "", text)  # remove HTML entities
        text = re.sub(r"\bamp\b", "", text)  # remove stray amp
        text = re.sub(r"\S+\.(jpg|jpeg|png|webp|gif)", "", text)
        return text

    def word_frequencies(self, df: pd.DataFrame, limit: int = 100) -> list[dict]:
        texts = df["content"].dropna().astype(str).str.lower()

        words = []
        for text in texts:
            tokens = re.findall(r"\b[a-z]{3,}\b", text)
            words.extend(w for w in tokens if w not in self.word_exclusions)

        counts = Counter(words)

        word_frequencies = (
            pd.DataFrame(counts.items(), columns=["word", "count"])
            .sort_values("count", ascending=False)
            .head(limit)
            .reset_index(drop=True)
        )

        return word_frequencies.to_dict(orient="records")

    def ngrams(self, df: pd.DataFrame, n=2, limit=100):
        texts = df["content"].dropna().astype(str).apply(self._clean_text).str.lower()
        all_ngrams = []

        for text in texts:
            tokens = re.findall(r"\b[a-z]{3,}\b", text)

            # stop word removal causes strange behaviors in ngrams
            # tokens = [w for w in tokens if w not in self.word_exclusions]

            ngrams = zip(*(islice(tokens, i, None) for i in range(n)))
            all_ngrams.extend([" ".join(ng) for ng in ngrams])

        counts = Counter(all_ngrams)

        return (
            pd.DataFrame(counts.items(), columns=["ngram", "count"])
            .sort_values("count", ascending=False)
            .head(limit)
            .to_dict(orient="records")
        )

    def lexical_diversity(self, df: pd.DataFrame) -> dict:
        tokens = (
            df["content"]
            .fillna("")
            .astype(str)
            .str.lower()
            .str.findall(r"\b[a-z]{2,}\b")
            .explode()
        )
        tokens = tokens[~tokens.isin(self.word_exclusions)]
        total = max(len(tokens), 1)
        unique = int(tokens.nunique())

        return {
            "total_tokens": total,
            "unique_tokens": unique,
            "ttr": round(unique / total, 4),
        }
