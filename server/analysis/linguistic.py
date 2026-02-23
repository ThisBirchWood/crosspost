import pandas as pd
import re

from collections import Counter
from itertools import islice

class LinguisticAnalysis:
    def __init__(self, df: pd.DataFrame, word_exclusions: set[str]):
        self.df = df
        self.word_exclusions = word_exclusions

    def _tokenize(self, text: str):
        tokens = re.findall(r"\b[a-z]{3,}\b", text)
        return [t for t in tokens if t not in self.word_exclusions]

    def _clean_text(self, text: str) -> str:
        text = re.sub(r"http\S+", "", text)        # remove URLs
        text = re.sub(r"www\S+", "", text)
        text = re.sub(r"&\w+;", "", text)          # remove HTML entities
        text = re.sub(r"\bamp\b", "", text)        # remove stray amp
        text = re.sub(r"\S+\.(jpg|jpeg|png|webp|gif)", "", text)
        return text

    def word_frequencies(self, limit: int = 100) -> dict:
        texts = (
            self.df["content"]
            .dropna()
            .astype(str)
            .str.lower()
        )

        words = []
        for text in texts:
            tokens = re.findall(r"\b[a-z]{3,}\b", text)
            words.extend(
                w for w in tokens
                if w not in self.word_exclusions
            )


        counts = Counter(words)

        word_frequencies = (
            pd.DataFrame(counts.items(), columns=["word", "count"])
            .sort_values("count", ascending=False)
            .head(limit)
            .reset_index(drop=True)
        )

        return word_frequencies.to_dict(orient="records")
    
    def ngrams(self, n=2, limit=100):
        texts = self.df["content"].dropna().astype(str).apply(self._clean_text).str.lower()
        all_ngrams = []

        for text in texts:
            tokens = re.findall(r"\b[a-z]{3,}\b", text)

            # stop word removal causes strange behaviors in ngrams
            #tokens = [w for w in tokens if w not in self.word_exclusions]

            ngrams = zip(*(islice(tokens, i, None) for i in range(n)))
            all_ngrams.extend([" ".join(ng) for ng in ngrams])

        counts = Counter(all_ngrams)

        return (
            pd.DataFrame(counts.items(), columns=["ngram", "count"])
            .sort_values("count", ascending=False)
            .head(limit)
            .to_dict(orient="records")
        )
        
    def identity_markers(self):
        df = self.df.copy()
        df["content"] = df["content"].fillna("").astype(str).str.lower()

        in_group_words = {"we", "us", "our", "ourselves"}
        out_group_words = {"they", "them", "their", "themselves"}

        emotion_exclusions = [
            "emotion_neutral",
            "emotion_surprise"
        ]

        emotion_cols = [
            col for col in self.df.columns
            if col.startswith("emotion_") and col not in emotion_exclusions
        ]
        in_count = 0
        out_count = 0
        in_emotions = {e: 0 for e in emotion_cols}
        out_emotions = {e: 0 for e in emotion_cols}
        total = 0

        for post in df:
            text = post["content"]
            tokens = re.findall(r"\b[a-z]{2,}\b", text)
            total += len(tokens)
            in_count += sum(t in in_group_words for t in tokens)
            out_count += sum(t in out_group_words for t in tokens)

            emotions = post[emotion_cols]
            print(emotions)

            

        return {
            "in_group_usage": in_count,
            "out_group_usage": out_count,
            "in_group_ratio": round(in_count / max(total, 1), 5),
            "out_group_ratio": round(out_count / max(total, 1), 5),
        }