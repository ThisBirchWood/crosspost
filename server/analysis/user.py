import pandas as pd

from server.analysis.interactional import InteractionAnalysis


class UserAnalysis:
    def __init__(self, interaction_analysis: InteractionAnalysis):
        self.interaction_analysis = interaction_analysis

    def top_users(self, df: pd.DataFrame) -> list:
        return self.interaction_analysis.top_users(df)

    def users(self, df: pd.DataFrame) -> dict | list:
        return self.interaction_analysis.per_user_analysis(df)

    def user(self, df: pd.DataFrame) -> dict:
        return {
            "top_users": self.top_users(df),
            "users": self.users(df),
        }
