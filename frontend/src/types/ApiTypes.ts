// Shared types
type FrequencyWord = {
  word: string;
  count: number;
};

type NGram = {
  count: number;
  ngram: string;
};

type Emotion = {
  emotion_anger: number;
  emotion_disgust: number;
  emotion_fear: number;
  emotion_joy: number;
  emotion_sadness: number;
};

// User
type TopUser = {
  author: string;
  source: string;
  count: number;
};

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
  avg_emotions?: Record<string, number>;
  vocab?: Vocab | null;
};

type InteractionGraph = Record<string, Record<string, number>>;

type UserEndpointResponse = {
  top_users: TopUser[];
  users: User[];
};

type UserAnalysisResponse = {
  top_users: TopUser[];
  users: User[];
  interaction_graph: InteractionGraph;
};

// Time
type EventsPerDay = {
  date: Date;
  count: number;
};

type HeatmapCell = {
  date: Date;
  hour: number;
  count: number;
};

type TimeAnalysisResponse = {
  events_per_day: EventsPerDay[];
  weekday_hour_heatmap: HeatmapCell[];
};

// Content (combines emotional and linguistic)
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
};

// Linguistic
type LinguisticAnalysisResponse = {
  word_frequencies: FrequencyWord[];
  common_two_phrases: NGram[];
  common_three_phrases: NGram[];
  lexical_diversity?: Record<string, number>;
};

// Emotional
type EmotionalAnalysisResponse = {
  average_emotion_by_topic: AverageEmotionByTopic[];
  overall_emotion_average?: OverallEmotionAverage[];
  dominant_emotion_distribution?: DominantEmotionDistribution[];
  emotion_by_source?: EmotionBySource[];
};

// Interactional
type ConversationConcentration = {
  total_commenting_authors: number;
  top_10pct_author_count: number;
  top_10pct_comment_share: number;
  single_comment_authors: number;
  single_comment_author_ratio: number;
};

type InteractionAnalysisResponse = {
  top_interaction_pairs?: [[string, string], number][];
  conversation_concentration?: ConversationConcentration;
  interaction_graph: InteractionGraph;
};

// Cultural
type IdentityMarkers = {
  in_group_usage: number;
  out_group_usage: number;
  in_group_ratio: number;
  out_group_ratio: number;
  in_group_posts: number;
  out_group_posts: number;
  tie_posts: number;
  in_group_emotion_avg?: Record<string, number>;
  out_group_emotion_avg?: Record<string, number>;
};

type StanceMarkers = {
  hedge_total: number;
  certainty_total: number;
  deontic_total: number;
  permission_total: number;
  hedge_per_1k_tokens: number;
  certainty_per_1k_tokens: number;
  deontic_per_1k_tokens: number;
  permission_per_1k_tokens: number;
};

type EntityEmotionAggregate = {
  post_count: number;
  emotion_avg: Record<string, number>;
};

type AverageEmotionPerEntity = {
  entity_emotion_avg: Record<string, EntityEmotionAggregate>;
};

type CulturalAnalysisResponse = {
  identity_markers?: IdentityMarkers;
  stance_markers?: StanceMarkers;
  avg_emotion_per_entity?: AverageEmotionPerEntity;
};

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

// Filter
type FilterResponse = {
  rows: number;
  data: any;
};

export type {
  TopUser,
  Vocab,
  User,
  InteractionGraph,
  ConversationConcentration,
  UserAnalysisResponse,
  UserEndpointResponse,
  FrequencyWord,
  AverageEmotionByTopic,
  OverallEmotionAverage,
  DominantEmotionDistribution,
  EmotionBySource,
  SummaryResponse,
  TimeAnalysisResponse,
  ContentAnalysisResponse,
  LinguisticAnalysisResponse,
  EmotionalAnalysisResponse,
  InteractionAnalysisResponse,
  IdentityMarkers,
  StanceMarkers,
  EntityEmotionAggregate,
  AverageEmotionPerEntity,
  CulturalAnalysisResponse,
  FilterResponse,
};
