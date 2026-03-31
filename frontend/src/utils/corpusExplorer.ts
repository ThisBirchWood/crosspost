import type { CSSProperties } from "react";

type EntityRecord = {
  text?: string;
  [key: string]: unknown;
};

type DatasetRecord = {
  id?: string | number;
  post_id?: string | number | null;
  parent_id?: string | number | null;
  author?: string | null;
  title?: string | null;
  content?: string | null;
  timestamp?: string | number | null;
  date?: string | null;
  dt?: string | null;
  hour?: number | null;
  weekday?: string | null;
  reply_to?: string | number | null;
  source?: string | null;
  topic?: string | null;
  topic_confidence?: number | null;
  type?: string | null;
  ner_entities?: EntityRecord[] | null;
  emotion_anger?: number | null;
  emotion_disgust?: number | null;
  emotion_fear?: number | null;
  emotion_joy?: number | null;
  emotion_sadness?: number | null;
  [key: string]: unknown;
};

type CorpusExplorerContext = {
  authorByPostId: Map<string, string>;
  authorEventCounts: Map<string, number>;
  authorCommentCounts: Map<string, number>;
};

type CorpusExplorerSpec = {
  title: string;
  description: string;
  emptyMessage?: string;
  matcher: (record: DatasetRecord, context: CorpusExplorerContext) => boolean;
};

const IN_GROUP_PATTERN = /\b(we|us|our|ourselves)\b/gi;
const OUT_GROUP_PATTERN = /\b(they|them|their|themselves)\b/gi;
const HEDGE_PATTERN = /\b(maybe|perhaps|possibly|probably|likely|seems|seem|i think|i feel|i guess|kind of|sort of|somewhat)\b/i;
const CERTAINTY_PATTERN = /\b(definitely|certainly|clearly|obviously|undeniably|always|never)\b/i;
const DEONTIC_PATTERN = /\b(must|should|need|needs|have to|has to|ought|required|require)\b/i;
const PERMISSION_PATTERN = /\b(can|allowed|okay|ok|permitted)\b/i;
const EMOTION_KEYS = [
  "emotion_anger",
  "emotion_disgust",
  "emotion_fear",
  "emotion_joy",
  "emotion_sadness",
] as const;

const shrinkButtonStyle: CSSProperties = {
  padding: "4px 8px",
  fontSize: 12,
};

const toText = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" || typeof id === "number") {
      return String(id);
    }
  }

  return "";
};

const normalize = (value: unknown) => toText(value).trim().toLowerCase();

const getRecordText = (record: DatasetRecord) =>
  `${record.title ?? ""} ${record.content ?? ""}`.trim();

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPhrasePattern = (phrase: string) => {
  const tokens = phrase
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp);

  if (!tokens.length) {
    return null;
  }

  return new RegExp(`\\b${tokens.join("\\s+")}\\b`, "i");
};

const countMatches = (pattern: RegExp, text: string) =>
  Array.from(text.matchAll(new RegExp(pattern.source, "gi"))).length;

const getDateBucket = (record: DatasetRecord) => {
  if (typeof record.date === "string" && record.date) {
    return record.date.slice(0, 10);
  }

  if (typeof record.dt === "string" && record.dt) {
    return record.dt.slice(0, 10);
  }

  if (typeof record.timestamp === "number") {
    return new Date(record.timestamp * 1000).toISOString().slice(0, 10);
  }

  if (typeof record.timestamp === "string" && record.timestamp) {
    const numeric = Number(record.timestamp);
    if (Number.isFinite(numeric)) {
      return new Date(numeric * 1000).toISOString().slice(0, 10);
    }
  }

  return "";
};

const getDominantEmotion = (record: DatasetRecord) => {
  let bestKey = "";
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const key of EMOTION_KEYS) {
    const value = Number(record[key] ?? Number.NEGATIVE_INFINITY);
    if (value > bestValue) {
      bestValue = value;
      bestKey = key;
    }
  }

  return bestKey.replace("emotion_", "");
};

const matchesPhrase = (record: DatasetRecord, phrase: string) => {
  const pattern = buildPhrasePattern(phrase);
  if (!pattern) {
    return false;
  }

  return pattern.test(getRecordText(record).toLowerCase());
};

const recordIdentityBucket = (record: DatasetRecord) => {
  const text = getRecordText(record).toLowerCase();
  const inHits = countMatches(IN_GROUP_PATTERN, text);
  const outHits = countMatches(OUT_GROUP_PATTERN, text);

  if (inHits > outHits) {
    return "in";
  }

  if (outHits > inHits) {
    return "out";
  }

  return "tie";
};

const createAuthorEventCounts = (records: DatasetRecord[]) => {
  const counts = new Map<string, number>();
  for (const record of records) {
    const author = toText(record.author).trim();
    if (!author) {
      continue;
    }
    counts.set(author, (counts.get(author) ?? 0) + 1);
  }
  return counts;
};

const createAuthorCommentCounts = (records: DatasetRecord[]) => {
  const counts = new Map<string, number>();
  for (const record of records) {
    const author = toText(record.author).trim();
    if (!author || record.type !== "comment") {
      continue;
    }
    counts.set(author, (counts.get(author) ?? 0) + 1);
  }
  return counts;
};

const createAuthorByPostId = (records: DatasetRecord[]) => {
  const map = new Map<string, string>();
  for (const record of records) {
    const postId = record.post_id;
    const author = toText(record.author).trim();
    if (postId === null || postId === undefined || !author) {
      continue;
    }
    map.set(String(postId), author);
  }
  return map;
};

const buildExplorerContext = (records: DatasetRecord[]): CorpusExplorerContext => ({
  authorByPostId: createAuthorByPostId(records),
  authorEventCounts: createAuthorEventCounts(records),
  authorCommentCounts: createAuthorCommentCounts(records),
});

const buildAllRecordsSpec = (): CorpusExplorerSpec => ({
  title: "Corpus Explorer",
  description: "All records in the current filtered dataset.",
  emptyMessage: "No records match the current filters.",
  matcher: () => true,
});

const buildUserSpec = (author: string): CorpusExplorerSpec => ({
  title: `User: ${author}`,
  description: `All records authored by ${author}.`,
  emptyMessage: `No records found for ${author}.`,
  matcher: (record) => normalize(record.author) === normalize(author),
});

const buildTopicSpec = (topic: string): CorpusExplorerSpec => ({
  title: `Topic: ${topic}`,
  description: `Records assigned to the ${topic} topic bucket.`,
  emptyMessage: `No records found in the ${topic} topic bucket.`,
  matcher: (record) => normalize(record.topic) === normalize(topic),
});

const buildDateBucketSpec = (date: string): CorpusExplorerSpec => ({
  title: `Date Bucket: ${date}`,
  description: `Records from the ${date} activity bucket.`,
  emptyMessage: `No records found on ${date}.`,
  matcher: (record) => getDateBucket(record) === date,
});

const buildWordSpec = (word: string): CorpusExplorerSpec => ({
  title: `Word: ${word}`,
  description: `Records containing the word ${word}.`,
  emptyMessage: `No records mention ${word}.`,
  matcher: (record) => matchesPhrase(record, word),
});

const buildNgramSpec = (ngram: string): CorpusExplorerSpec => ({
  title: `N-gram: ${ngram}`,
  description: `Records containing the phrase ${ngram}.`,
  emptyMessage: `No records contain the phrase ${ngram}.`,
  matcher: (record) => matchesPhrase(record, ngram),
});

const buildEntitySpec = (entity: string): CorpusExplorerSpec => ({
  title: `Entity: ${entity}`,
  description: `Records mentioning the ${entity} entity.`,
  emptyMessage: `No records found for the ${entity} entity.`,
  matcher: (record) => {
    const target = normalize(entity);
    const entities = Array.isArray(record.ner_entities) ? record.ner_entities : [];
    return entities.some((item) => normalize(item?.text) === target) || matchesPhrase(record, entity);
  },
});

const buildSourceSpec = (source: string): CorpusExplorerSpec => ({
  title: `Source: ${source}`,
  description: `Records from the ${source} source.`,
  emptyMessage: `No records found for ${source}.`,
  matcher: (record) => normalize(record.source) === normalize(source),
});

const buildDominantEmotionSpec = (emotion: string): CorpusExplorerSpec => ({
  title: `Dominant Emotion: ${emotion}`,
  description: `Records where ${emotion} is the strongest emotion score.`,
  emptyMessage: `No records found with dominant emotion ${emotion}.`,
  matcher: (record) => getDominantEmotion(record) === normalize(emotion),
});

const buildReplyPairSpec = (source: string, target: string): CorpusExplorerSpec => ({
  title: `Reply Path: ${source} -> ${target}`,
  description: `Reply records authored by ${source} in response to ${target}.`,
  emptyMessage: `No reply records found for ${source} -> ${target}.`,
  matcher: (record, context) => {
    if (normalize(record.author) !== normalize(source)) {
      return false;
    }

    const replyTo = record.reply_to;
    if (replyTo === null || replyTo === undefined || replyTo === "") {
      return false;
    }

    const replyTarget = context.authorByPostId.get(String(replyTo));
    return normalize(replyTarget) === normalize(target);
  },
});

const buildOneTimeUsersSpec = (): CorpusExplorerSpec => ({
  title: "One-Time Users",
  description: "Records written by authors who appear exactly once in the filtered corpus.",
  emptyMessage: "No one-time-user records found.",
  matcher: (record, context) => {
    const author = toText(record.author).trim();
    return !!author && context.authorEventCounts.get(author) === 1;
  },
});

const buildTopCommentersSpec = (topAuthorCount: number): CorpusExplorerSpec => ({
  title: "Top Commenters",
  description: `Comment records from the top ${topAuthorCount} commenters in the filtered corpus.`,
  emptyMessage: "No top-commenter records found.",
  matcher: (record, context) => {
    if (record.type !== "comment") {
      return false;
    }

    const rankedAuthors = Array.from(context.authorCommentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topAuthorCount)
      .map(([author]) => author);

    return rankedAuthors.includes(toText(record.author).trim());
  },
});

const buildSingleCommentAuthorsSpec = (): CorpusExplorerSpec => ({
  title: "Single-Comment Authors",
  description: "Comment records from authors who commented exactly once.",
  emptyMessage: "No single-comment-author records found.",
  matcher: (record, context) => {
    const author = toText(record.author).trim();
    return record.type === "comment" && !!author && context.authorCommentCounts.get(author) === 1;
  },
});

const buildIdentityBucketSpec = (bucket: "in" | "out" | "tie"): CorpusExplorerSpec => {
  const labels = {
    in: "In-Group Posts",
    out: "Out-Group Posts",
    tie: "Balanced Posts",
  } as const;

  return {
    title: labels[bucket],
    description: `Records in the ${labels[bucket].toLowerCase()} cultural bucket.`,
    emptyMessage: `No records found for ${labels[bucket].toLowerCase()}.`,
    matcher: (record) => recordIdentityBucket(record) === bucket,
  };
};

const buildPatternSpec = (
  title: string,
  description: string,
  pattern: RegExp,
): CorpusExplorerSpec => ({
  title,
  description,
  emptyMessage: `No records found for ${title.toLowerCase()}.`,
  matcher: (record) => pattern.test(getRecordText(record)),
});

const buildHedgeSpec = () =>
  buildPatternSpec("Hedging Words", "Records containing hedging language.", HEDGE_PATTERN);

const buildCertaintySpec = () =>
  buildPatternSpec("Certainty Words", "Records containing certainty language.", CERTAINTY_PATTERN);

const buildDeonticSpec = () =>
  buildPatternSpec("Need/Should Words", "Records containing deontic language.", DEONTIC_PATTERN);

const buildPermissionSpec = () =>
  buildPatternSpec("Permission Words", "Records containing permission language.", PERMISSION_PATTERN);

const getExplorerButtonStyle = () => shrinkButtonStyle;

export type { DatasetRecord, CorpusExplorerContext, CorpusExplorerSpec };
export {
  buildAllRecordsSpec,
  buildCertaintySpec,
  buildDateBucketSpec,
  buildDeonticSpec,
  buildDominantEmotionSpec,
  buildEntitySpec,
  buildExplorerContext,
  buildHedgeSpec,
  buildIdentityBucketSpec,
  buildNgramSpec,
  buildOneTimeUsersSpec,
  buildPermissionSpec,
  buildReplyPairSpec,
  buildSingleCommentAuthorsSpec,
  buildSourceSpec,
  buildTopicSpec,
  buildTopCommentersSpec,
  buildUserSpec,
  buildWordSpec,
  getDateBucket,
  getExplorerButtonStyle,
  toText,
};
