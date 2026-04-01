import re
from collections import Counter
from dataclasses import dataclass

import pandas as pd


@dataclass(frozen=True)
class NGramConfig:
    min_token_length: int = 3
    min_count: int = 2
    max_results: int = 100


class LinguisticAnalysis:
    def __init__(self, word_exclusions: set[str]):
        self.word_exclusions = word_exclusions
        self.ngram_config = NGramConfig()

    def _tokenize(self, text: str, *, include_exclusions: bool = False) -> list[str]:
        pattern = rf"\b[a-z]{{{self.ngram_config.min_token_length},}}\b"
        tokens = re.findall(pattern, text)

        if include_exclusions:
            return tokens

        return [token for token in tokens if token not in self.word_exclusions]

    def _clean_text(self, text: str) -> str:
        text = re.sub(r"http\S+", "", text)  # remove URLs
        text = re.sub(r"www\S+", "", text)
        text = re.sub(r"&\w+;", "", text)  # remove HTML entities
        text = re.sub(r"\bamp\b", "", text)  # remove stray amp
        text = re.sub(r"\S+\.(jpg|jpeg|png|webp|gif)", "", text)
        return text

    def _content_texts(self, df: pd.DataFrame) -> pd.Series:
        return df["content"].dropna().astype(str).apply(self._clean_text).str.lower()

    def _valid_ngram(self, tokens: tuple[str, ...]) -> bool:
        if any(token in self.word_exclusions for token in tokens):
            return False

        if len(set(tokens)) == 1:
            return False

        return True

    def word_frequencies(self, df: pd.DataFrame, limit: int = 100) -> list[dict]:
        texts = self._content_texts(df)

        words = []
        for text in texts:
            words.extend(self._tokenize(text))

        counts = Counter(words)

        word_frequencies = (
            pd.DataFrame(counts.items(), columns=["word", "count"])
            .sort_values("count", ascending=False)
            .head(limit)
            .reset_index(drop=True)
        )

        return word_frequencies.to_dict(orient="records")

    def ngrams(self, df: pd.DataFrame, n: int = 2, limit: int | None = None) -> list[dict]:
        if n < 2:
            raise ValueError("n must be at least 2")

        texts = self._content_texts(df)
        all_ngrams = []
        result_limit = limit or self.ngram_config.max_results

        for text in texts:
            tokens = self._tokenize(text, include_exclusions=True)

            if len(tokens) < n:
                continue

            for index in range(len(tokens) - n + 1):
                ngram_tokens = tuple(tokens[index : index + n])
                if self._valid_ngram(ngram_tokens):
                    all_ngrams.append(" ".join(ngram_tokens))

        counts = Counter(all_ngrams)
        filtered_counts = [
            (ngram, count)
            for ngram, count in counts.items()
            if count >= self.ngram_config.min_count
        ]

        if not filtered_counts:
            return []

        return (
            pd.DataFrame(filtered_counts, columns=["ngram", "count"])
            .sort_values(["count", "ngram"], ascending=[False, True])
            .head(result_limit)
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
