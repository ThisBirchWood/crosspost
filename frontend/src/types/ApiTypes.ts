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

type InteractionGraph = Record<string, Record<string, number>>;

type UserAnalysisResponse = {
  top_users: TopUser[];
  users: User[];
  interaction_graph: InteractionGraph;
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
}

// Content Analysis
type Emotion = {
  emotion_anger: number;
  emotion_disgust: number;
  emotion_fear: number;
  emotion_joy: number;
  emotion_sadness: number;
};

type NGram = {
    count: number;
    ngram: string;
}

type AverageEmotionByTopic = Emotion & {
  n: number;
  topic: string;
  [key: string]: string | number;
};

type OverallEmotionAverage = {
  emotion: string;
  score: number;
};

type DominantEmotionDistribution = {
  emotion: string;
  count: number;
  ratio: number;
};

type EmotionBySource = {
  source: string;
  dominant_emotion: string;
  dominant_score: number;
  event_count: number;
};


type ContentAnalysisResponse = {
    word_frequencies: FrequencyWord[];
    average_emotion_by_topic: AverageEmotionByTopic[];
    common_three_phrases: NGram[];
    common_two_phrases: NGram[];
    overall_emotion_average?: OverallEmotionAverage[];
    dominant_emotion_distribution?: DominantEmotionDistribution[];
    emotion_by_source?: EmotionBySource[];
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
    InteractionGraph,
    UserAnalysisResponse,
    FrequencyWord,
    AverageEmotionByTopic,
    OverallEmotionAverage,
    DominantEmotionDistribution,
    EmotionBySource,
    SummaryResponse,
    TimeAnalysisResponse,
    ContentAnalysisResponse,
    FilterResponse
}
