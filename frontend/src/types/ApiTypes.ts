// User Responses
type TopUser = { 
    author: string; 
    source: string; 
    count: number 
};

type FrequencyWord = {
    word: string;
    count: number;
}

type AverageEmotionByTopic = {
    topic: string;
    n: number;
    [emotion: string]: string | number;
}

type Vocab = {
  author: string;
  events: number;
  total_words: number;
  unique_words: number;
  vocab_richness: number;
  avg_words_per_event: number;
  top_words: FrequencyWord[];
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

// Time Analysis
type EventsPerDay = {
    date: Date;
    count: number;
}

type HeatmapCell = {
    date: Date;
    hour: number;
    count: number;
}

type TimeAnalysisResponse = {
    events_per_day: EventsPerDay[];
    weekday_hour_heatmap: HeatmapCell[];
    burstiness: number;
}

// Content Analysis
type ContentAnalysisResponse = {
    word_frequencies: FrequencyWord[];
    average_emotion_by_topic: AverageEmotionByTopic[];
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

// Filtering Response
type FilterResponse = {
    rows: number
    data: any;
}

export type {
    TopUser,
    Vocab,
    User,
    UserAnalysisResponse,
    FrequencyWord,
    AverageEmotionByTopic,
    SummaryResponse,
    TimeAnalysisResponse,
    ContentAnalysisResponse,
    FilterResponse
}
