import Card from "./Card";
import StatsStyling from "../styles/stats_styling";
import type { CulturalAnalysisResponse } from "../types/ApiTypes";

const styles = StatsStyling;

type CulturalStatsProps = {
  data: CulturalAnalysisResponse;
};

const CulturalStats = ({ data }: CulturalStatsProps) => {
  const identity = data.identity_markers;
  const stance = data.stance_markers;
  const rawEntities = data.avg_emotion_per_entity?.entity_emotion_avg ?? {};
  const entities = Object.entries(rawEntities)
    .sort((a, b) => (b[1].post_count - a[1].post_count))
    .slice(0, 20);

  const topEmotion = (emotionAvg: Record<string, number> | undefined) => {
    const entries = Object.entries(emotionAvg ?? {});
    if (!entries.length) {
      return "—";
    }

    entries.sort((a, b) => b[1] - a[1]);
    const dominant = entries[0] ?? ["emotion_unknown", 0];
    const dominantLabel = dominant[0].replace("emotion_", "");
    return `${dominantLabel} (${dominant[1].toFixed(3)})`;
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, ...styles.grid }}>
        <Card
          label="In-Group Usage"
          value={identity?.in_group_usage?.toLocaleString() ?? "—"}
          sublabel="we/us/our references"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Out-Group Usage"
          value={identity?.out_group_usage?.toLocaleString() ?? "—"}
          sublabel="they/them/their references"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="In-Group Posts"
          value={identity?.in_group_posts?.toLocaleString() ?? "—"}
          sublabel="Posts with stronger in-group language"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Out-Group Posts"
          value={identity?.out_group_posts?.toLocaleString() ?? "—"}
          sublabel="Posts with stronger out-group language"
          style={{ gridColumn: "span 3" }}
        />

        <Card
          label="Hedge Markers"
          value={stance?.hedge_total?.toLocaleString() ?? "—"}
          sublabel={typeof stance?.hedge_per_1k_tokens === "number" ? `${stance.hedge_per_1k_tokens.toFixed(3)} per 1k tokens` : "Marker frequency"}
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Certainty Markers"
          value={stance?.certainty_total?.toLocaleString() ?? "—"}
          sublabel={typeof stance?.certainty_per_1k_tokens === "number" ? `${stance.certainty_per_1k_tokens.toFixed(3)} per 1k tokens` : "Marker frequency"}
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Deontic Markers"
          value={stance?.deontic_total?.toLocaleString() ?? "—"}
          sublabel={typeof stance?.deontic_per_1k_tokens === "number" ? `${stance.deontic_per_1k_tokens.toFixed(3)} per 1k tokens` : "Marker frequency"}
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Permission Markers"
          value={stance?.permission_total?.toLocaleString() ?? "—"}
          sublabel={typeof stance?.permission_per_1k_tokens === "number" ? `${stance.permission_per_1k_tokens.toFixed(3)} per 1k tokens` : "Marker frequency"}
          style={{ gridColumn: "span 3" }}
        />

        <div style={{ ...styles.card, gridColumn: "span 6" }}>
          <h2 style={styles.sectionTitle}>In-Group Emotion Profile</h2>
          <p style={styles.sectionSubtitle}>Dominant average emotion where in-group framing is stronger.</p>
          <div style={styles.topUserName}>{topEmotion(identity?.in_group_emotion_avg)}</div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 6" }}>
          <h2 style={styles.sectionTitle}>Out-Group Emotion Profile</h2>
          <p style={styles.sectionSubtitle}>Dominant average emotion where out-group framing is stronger.</p>
          <div style={styles.topUserName}>{topEmotion(identity?.out_group_emotion_avg)}</div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 12" }}>
          <h2 style={styles.sectionTitle}>Entity Emotion Averages</h2>
          <p style={styles.sectionSubtitle}>Most frequent entities and their dominant average emotion signature.</p>
          {!entities.length ? (
            <div style={styles.topUserMeta}>No entity-level cultural data available.</div>
          ) : (
            <div style={{ ...styles.topUsersList, maxHeight: 420, overflowY: "auto" }}>
              {entities.map(([entity, aggregate]) => (
                <div key={entity} style={styles.topUserItem}>
                  <div style={styles.topUserName}>{entity}</div>
                  <div style={styles.topUserMeta}>
                    {aggregate.post_count.toLocaleString()} posts • Dominant emotion: {topEmotion(aggregate.emotion_avg)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CulturalStats;
