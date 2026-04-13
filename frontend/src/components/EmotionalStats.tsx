import type { EmotionalAnalysisResponse } from "../types/ApiTypes";
import StatsStyling from "../styles/stats_styling";
import {
  buildDominantEmotionSpec,
  buildSourceSpec,
  buildTopicSpec,
  type CorpusExplorerSpec,
} from "../utils/corpusExplorer";

const styles = StatsStyling;

type EmotionalStatsProps = {
  emotionalData: EmotionalAnalysisResponse;
  onExplore: (spec: CorpusExplorerSpec) => void;
};

const EmotionalStats = ({ emotionalData, onExplore }: EmotionalStatsProps) => {
  const rows = emotionalData.average_emotion_by_topic ?? [];
  const overallEmotionAverage = emotionalData.overall_emotion_average ?? [];
  const dominantEmotionDistribution =
    emotionalData.dominant_emotion_distribution ?? [];
  const emotionBySource = emotionalData.emotion_by_source ?? [];
  const lowSampleThreshold = 20;
  const stableSampleThreshold = 50;
  const emotionKeys = rows.length
    ? Object.keys(rows[0]).filter((key) => key.startsWith("emotion_"))
    : [];

  const strongestPerTopic = rows.map((row) => {
    let maxKey = "";
    let maxValue = Number.NEGATIVE_INFINITY;

    emotionKeys.forEach((key) => {
      const value = Number(row[key] ?? 0);
      if (value > maxValue) {
        maxValue = value;
        maxKey = key;
      }
    });

    return {
      topic: String(row.topic),
      count: Number(row.n ?? 0),
      emotion: maxKey.replace("emotion_", "") || "unknown",
      value: maxValue > Number.NEGATIVE_INFINITY ? maxValue : 0,
    };
  });

  const formatEmotion = (value: string) => {
    if (!value) return "Unknown";
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const sampleSizes = strongestPerTopic
    .map((topic) => topic.count)
    .filter((count) => Number.isFinite(count) && count > 0)
    .sort((a, b) => a - b);

  const lowSampleTopics = strongestPerTopic.filter(
    (topic) => topic.count < lowSampleThreshold,
  ).length;
  const stableSampleTopics = strongestPerTopic.filter(
    (topic) => topic.count >= stableSampleThreshold,
  ).length;

  const medianSampleSize = sampleSizes.length
    ? sampleSizes[Math.floor(sampleSizes.length / 2)]
    : 0;

  if (!rows.length) {
    return (
      <div style={{ ...styles.container, ...styles.card, marginTop: 16 }}>
        <h2 style={styles.sectionTitle}>Emotion by Topic</h2>
        <p style={styles.sectionSubtitle}>No topic emotion data available.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, ...styles.card, marginTop: 16 }}>
        <h2 style={styles.sectionTitle}>Topic Mood Overview</h2>
        <p style={styles.sectionSubtitle}>
          Use the strength score together with post count. Topics with fewer
          than {lowSampleThreshold} events are often noisy.
        </p>
        <div style={styles.emotionalSummaryRow}>
          <span>
            <strong style={{ color: "#24292f" }}>Topics:</strong>{" "}
            {strongestPerTopic.length}
          </span>
          <span>
            <strong style={{ color: "#24292f" }}>Median Posts:</strong>{" "}
            {medianSampleSize}
          </span>
          <span>
            <strong style={{ color: "#24292f" }}>
              Small Topics (&lt;{lowSampleThreshold}):
            </strong>{" "}
            {lowSampleTopics}
          </span>
          <span>
            <strong style={{ color: "#24292f" }}>
              Stable Topics ({stableSampleThreshold}+):
            </strong>{" "}
            {stableSampleTopics}
          </span>
        </div>
        <p
          style={{ ...styles.sectionSubtitle, marginTop: 10, marginBottom: 0 }}
        >
          Strength means how far the top emotion is ahead in that topic. It does
          not mean model accuracy.
        </p>
      </div>

      <div style={{ ...styles.container, ...styles.grid }}>
        <div style={{ ...styles.card, gridColumn: "span 4" }}>
          <h2 style={styles.sectionTitle}>Mood Averages</h2>
          <p style={styles.sectionSubtitle}>Average score for each emotion.</p>
          {!overallEmotionAverage.length ? (
            <div style={styles.topUserMeta}>
              No overall emotion averages available.
            </div>
          ) : (
            <div
              style={{
                ...styles.topUsersList,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {[...overallEmotionAverage]
                .sort((a, b) => b.score - a.score)
                .map((row) => (
                  <div
                    key={row.emotion}
                    style={{ ...styles.topUserItem, cursor: "pointer" }}
                    onClick={() => onExplore(buildDominantEmotionSpec(row.emotion))}
                  >
                    <div style={styles.topUserName}>
                      {formatEmotion(row.emotion)}
                    </div>
                    <div style={styles.topUserMeta}>{row.score.toFixed(3)}</div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div style={{ ...styles.card, gridColumn: "span 4" }}>
          <h2 style={styles.sectionTitle}>Mood Split</h2>
          <p style={styles.sectionSubtitle}>
            How often each emotion is dominant.
          </p>
          {!dominantEmotionDistribution.length ? (
            <div style={styles.topUserMeta}>
              No dominant-emotion split available.
            </div>
          ) : (
            <div
              style={{
                ...styles.topUsersList,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {[...dominantEmotionDistribution]
                .sort((a, b) => b.ratio - a.ratio)
                .map((row) => (
                  <div
                    key={row.emotion}
                    style={{ ...styles.topUserItem, cursor: "pointer" }}
                    onClick={() => onExplore(buildDominantEmotionSpec(row.emotion))}
                  >
                    <div style={styles.topUserName}>
                      {formatEmotion(row.emotion)}
                    </div>
                    <div style={styles.topUserMeta}>
                      {(row.ratio * 100).toFixed(1)}% •{" "}
                      {row.count.toLocaleString()} events
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div style={{ ...styles.card, gridColumn: "span 4" }}>
          <h2 style={styles.sectionTitle}>Mood by Source</h2>
          <p style={styles.sectionSubtitle}>Leading emotion in each source.</p>
          {!emotionBySource.length ? (
            <div style={styles.topUserMeta}>
              No source emotion profile available.
            </div>
          ) : (
            <div
              style={{
                ...styles.topUsersList,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {[...emotionBySource]
                .sort((a, b) => b.event_count - a.event_count)
                .map((row) => (
                  <div
                    key={row.source}
                    style={{ ...styles.topUserItem, cursor: "pointer" }}
                    onClick={() => onExplore(buildSourceSpec(row.source))}
                  >
                    <div style={styles.topUserName}>{row.source}</div>
                    <div style={styles.topUserMeta}>
                      {formatEmotion(row.dominant_emotion)} •{" "}
                      {row.dominant_score.toFixed(3)} •{" "}
                      {row.event_count.toLocaleString()} events
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div style={{ ...styles.card, gridColumn: "span 12" }}>
          <h2 style={styles.sectionTitle}>Topic Snapshots</h2>
          <p style={styles.sectionSubtitle}>
            Per-topic mood with strength and post count.
          </p>
          <div style={{ ...styles.grid, marginTop: 10 }}>
            {strongestPerTopic.map((topic) => (
              <div
                key={topic.topic}
                style={{ ...styles.cardBase, gridColumn: "span 4", cursor: "pointer" }}
                onClick={() => onExplore(buildTopicSpec(topic.topic))}
              >
                <h3 style={{ ...styles.sectionTitle, marginBottom: 6 }}>
                  {topic.topic}
                </h3>
                <div style={styles.emotionalTopicLabel}>Likely Mood</div>
                <div style={styles.emotionalTopicValue}>
                  {formatEmotion(topic.emotion)}
                </div>
                <div style={styles.emotionalMetricRow}>
                  <span>Strength</span>
                  <span style={styles.emotionalMetricValue}>
                    {topic.value.toFixed(3)}
                  </span>
                </div>
                <div style={styles.emotionalMetricRowCompact}>
                  <span>Posts in Topic</span>
                  <span style={styles.emotionalMetricValue}>{topic.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionalStats;
