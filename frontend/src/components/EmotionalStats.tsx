import type { ContentAnalysisResponse } from "../types/ApiTypes"
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;

type EmotionalStatsProps = {
  contentData: ContentAnalysisResponse;
}

const EmotionalStats = ({contentData}: EmotionalStatsProps) => {
  const rows = contentData.average_emotion_by_topic ?? [];
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
        <p style={styles.sectionSubtitle}>Mean emotion scores for each detected topic</p>
      </div>

      <div style={{ ...styles.container, ...styles.grid }}>
        {strongestPerTopic.map((topic) => (
          <div key={topic.topic} style={{ ...styles.card, gridColumn: "span 4" }}>
            <h3 style={{ ...styles.sectionTitle, marginBottom: 6 }}>{topic.topic}</h3>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Top emotion: {topic.emotion}</div>
            <p style={styles.sectionSubtitle}>Model Confidence: {topic.value.toFixed(3)}</p>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
              Based on {topic.count} events
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EmotionalStats;
