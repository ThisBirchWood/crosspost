import type { ContentAnalysisResponse } from "../types/ApiTypes"
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;

type EmotionalStatsProps = {
  contentData: ContentAnalysisResponse;
}

const EmotionalStats = ({contentData}: EmotionalStatsProps) => {
  const rows = contentData.average_emotion_by_topic ?? [];
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
      value: maxValue > Number.NEGATIVE_INFINITY ? maxValue : 0
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

  const lowSampleTopics = strongestPerTopic.filter((topic) => topic.count < lowSampleThreshold).length;
  const stableSampleTopics = strongestPerTopic.filter((topic) => topic.count >= stableSampleThreshold).length;

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
        <h2 style={styles.sectionTitle}>Average Emotion by Topic</h2>
        <p style={styles.sectionSubtitle}>Read confidence together with sample size. Topics with fewer than {lowSampleThreshold} events are usually noisy and less reliable.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 13, color: "#4b5563", marginTop: 6 }}>
          <span><strong style={{ color: "#111827" }}>Topics:</strong> {strongestPerTopic.length}</span>
          <span><strong style={{ color: "#111827" }}>Median Sample:</strong> {medianSampleSize} events</span>
          <span><strong style={{ color: "#111827" }}>Low Sample (&lt;{lowSampleThreshold}):</strong> {lowSampleTopics}</span>
          <span><strong style={{ color: "#111827" }}>Stable Sample ({stableSampleThreshold}+):</strong> {stableSampleTopics}</span>
        </div>
        <p style={{ ...styles.sectionSubtitle, marginTop: 10, marginBottom: 0 }}>
          Confidence reflects how strongly one emotion leads within a topic, not model accuracy. Use larger samples for stronger conclusions.
        </p>
      </div>

      <div style={{ ...styles.container, ...styles.grid }}>
        {strongestPerTopic.map((topic) => (
          <div key={topic.topic} style={{ ...styles.card, gridColumn: "span 4" }}>
            <h3 style={{ ...styles.sectionTitle, marginBottom: 6 }}>{topic.topic}</h3>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: "0.02em", textTransform: "uppercase" }}>
              Top Emotion
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, lineHeight: 1.2 }}>
              {formatEmotion(topic.emotion)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 13, color: "#6b7280" }}>
              <span>Confidence</span>
              <span style={{ fontWeight: 700, color: "#111827" }}>{topic.value.toFixed(3)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 13, color: "#6b7280" }}>
              <span>Sample Size</span>
              <span style={{ fontWeight: 700, color: "#111827" }}>{topic.count} events</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EmotionalStats;
