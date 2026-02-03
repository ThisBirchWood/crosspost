// User Code
type TopUser = { 
    author: string; 
    source: string; 
    count: number 
};

type Vocab = {
  author: string;
  events: number;
  total_words: number;
  unique_words: number;
  vocab_richness: number;
  avg_words_per_event: number;
  top_words: { word: string; count: number }[];
};

type User = {
  author: string;
  post: number;
  comment: number;
  comment_post_ratio: number;
  comment_share: number;
  vocab?: Vocab | null;
};

type UserAnalysisResponse = {
  top_users: TopUser[];
  users: User[];
};

type FrequencyWord = {
    word: string;
    count: number;
}

// Summary
type SummaryResponse = {
  total_events: number;
  total_posts: number;
  total_comments: number;
  unique_users: number;
  comments_per_post: number;
  lurker_ratio: number;
  time_range: {
    start: number;
    end: number;
  };
  sources: string[];
};

export type {
    TopUser,
    Vocab,
    User,
    UserAnalysisResponse,
    FrequencyWord,
    SummaryResponse
}