import pandas as pd
import re

from collections import Counter

class LinguisticAnalysis:
    def __init__(self, df: pd.DataFrame, word_exclusions: set[str]):
        self.df = df
        self.word_exclusions = word_exclusions

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