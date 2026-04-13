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
const getAuthor = (record: DatasetRecord) => toText(record.author).trim();

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

  return pattern.test(getRecordText(record));
};

const recordIdentityBucket = (record: DatasetRecord) => {
  const text = getRecordText(record);
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

const buildExplorerContext = (records: DatasetRecord[]): CorpusExplorerContext => {
  const authorByPostId = new Map<string, string>();
  const authorEventCounts = new Map<string, number>();
  const authorCommentCounts = new Map<string, number>();

  for (const record of records) {
    const author = getAuthor(record);
    if (!author) {
      continue;
    }

    authorEventCounts.set(author, (authorEventCounts.get(author) ?? 0) + 1);

    if (record.type === "comment") {
      authorCommentCounts.set(author, (authorCommentCounts.get(author) ?? 0) + 1);
    }

    if (record.post_id !== null && record.post_id !== undefined) {
      authorByPostId.set(String(record.post_id), author);
    }
  }

  return { authorByPostId, authorEventCounts, authorCommentCounts };
};

const buildAllRecordsSpec = (): CorpusExplorerSpec => ({
  title: "Corpus Explorer",
  description: "All records in the current filtered dataset.",
  emptyMessage: "No records match the current filters.",
  matcher: () => true,
});

const buildUserSpec = (author: string): CorpusExplorerSpec => {
  const target = normalize(author);

  return {
    title: `User: ${author}`,
    description: `All records authored by ${author}.`,
    emptyMessage: `No records found for ${author}.`,
    matcher: (record) => normalize(record.author) === target,
  };
};

const buildTopicSpec = (topic: string): CorpusExplorerSpec => {
  const target = normalize(topic);

  return {
    title: `Topic: ${topic}`,
    description: `Records assigned to the ${topic} topic bucket.`,
    emptyMessage: `No records found in the ${topic} topic bucket.`,
    matcher: (record) => normalize(record.topic) === target,
  };
};

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

const buildEntitySpec = (entity: string): CorpusExplorerSpec => {
  const target = normalize(entity);

  return {
    title: `Entity: ${entity}`,
    description: `Records mentioning the ${entity} entity.`,
    emptyMessage: `No records found for the ${entity} entity.`,
    matcher: (record) => {
      const entities = Array.isArray(record.ner_entities) ? record.ner_entities : [];
      return entities.some((item) => normalize(item?.text) === target) || matchesPhrase(record, entity);
    },
  };
};

const buildSourceSpec = (source: string): CorpusExplorerSpec => {
  const target = normalize(source);

  return {
    title: `Source: ${source}`,
    description: `Records from the ${source} source.`,
    emptyMessage: `No records found for ${source}.`,
    matcher: (record) => normalize(record.source) === target,
  };
};

const buildDominantEmotionSpec = (emotion: string): CorpusExplorerSpec => {
  const target = normalize(emotion);

  return {
    title: `Dominant Emotion: ${emotion}`,
    description: `Records where ${emotion} is the strongest emotion score.`,
    emptyMessage: `No records found with dominant emotion ${emotion}.`,
    matcher: (record) => getDominantEmotion(record) === target,
  };
};

const buildReplyPairSpec = (source: string, target: string): CorpusExplorerSpec => {
  const sourceName = normalize(source);
  const targetName = normalize(target);

  return {
    title: `Reply Path: ${source} -> ${target}`,
    description: `Reply records authored by ${source} in response to ${target}.`,
    emptyMessage: `No reply records found for ${source} -> ${target}.`,
    matcher: (record, context) => {
      if (normalize(record.author) !== sourceName) {
        return false;
      }

      const replyTo = record.reply_to;
      if (replyTo === null || replyTo === undefined || replyTo === "") {
        return false;
      }

      return normalize(context.authorByPostId.get(String(replyTo))) === targetName;
    },
  };
};

const buildOneTimeUsersSpec = (): CorpusExplorerSpec => ({
  title: "One-Time Users",
  description: "Records written by authors who appear exactly once in the filtered corpus.",
  emptyMessage: "No one-time-user records found.",
  matcher: (record, context) => {
    const author = getAuthor(record);
    return !!author && context.authorEventCounts.get(author) === 1;
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

export type { DatasetRecord, CorpusExplorerSpec };
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
  buildSourceSpec,
  buildTopicSpec,
  buildUserSpec,
  buildWordSpec,
  getDateBucket,
  toText,
};
