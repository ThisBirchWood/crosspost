import Card from "./Card";
import StatsStyling from "../styles/stats_styling";
import type { CulturalAnalysisResponse } from "../types/ApiTypes";
import {
  buildCertaintySpec,
  buildDeonticSpec,
  buildEntitySpec,
  buildHedgeSpec,
  buildIdentityBucketSpec,
  buildPermissionSpec,
  getExplorerButtonStyle,
  type CorpusExplorerSpec,
} from "../utils/corpusExplorer";

const styles = StatsStyling;

type CulturalStatsProps = {
  data: CulturalAnalysisResponse;
  onExplore: (spec: CorpusExplorerSpec) => void;
};

const renderExploreButton = (onClick: () => void) => (
  <button
    onClick={onClick}
    style={{ ...styles.buttonSecondary, ...getExplorerButtonStyle() }}
  >
    Explore
  </button>
);

const CulturalStats = ({ data, onExplore }: CulturalStatsProps) => {
  const identity = data.identity_markers;
  const stance = data.stance_markers;
  const inGroupWords = identity?.in_group_usage ?? 0;
  const outGroupWords = identity?.out_group_usage ?? 0;
  const totalGroupWords = inGroupWords + outGroupWords;
  const inGroupWordRate =
    typeof identity?.in_group_ratio === "number"
      ? identity.in_group_ratio * 100
      : null;
  const outGroupWordRate =
    typeof identity?.out_group_ratio === "number"
      ? identity.out_group_ratio * 100
      : null;
  const rawEntities = data.avg_emotion_per_entity?.entity_emotion_avg ?? {};
  const entities = Object.entries(rawEntities)
    .sort((a, b) => b[1].post_count - a[1].post_count)
    .slice(0, 20);

  const topEmotion = (emotionAvg: Record<string, number> | undefined) => {
    const entries = Object.entries(emotionAvg ?? {});
    if (!entries.length) {
      return "-";
    }

    entries.sort((a, b) => b[1] - a[1]);
    const dominant = entries[0] ?? ["emotion_unknown", 0];
    const dominantLabel = dominant[0].replace("emotion_", "");
    return `${dominantLabel} (${(dominant[1] * 100).toFixed(1)}%)`;
  };

  const stanceSublabel = (
    per1kTokens: number | undefined,
    emotionAvg: Record<string, number> | undefined,
  ) => {
    const rateLabel =
      typeof per1kTokens === "number"
        ? `${per1kTokens.toFixed(1)} per 1k words`
        : "Word frequency";
    const emotionLabel = topEmotion(emotionAvg);

    return emotionLabel === "—"
      ? rateLabel
      : `${rateLabel} • Avg mood: ${emotionLabel}`;
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, ...styles.grid }}>
        <div style={{ ...styles.card, gridColumn: "span 12" }}>
          <h2 style={styles.sectionTitle}>Community Framing Overview</h2>
          <p style={styles.sectionSubtitle}>
            Simple view of how often people use "us" words vs "them" words, and
            the tone around that language.
          </p>
        </div>

        <Card
          label="In-Group Words"
          value={inGroupWords.toLocaleString()}
          sublabel="Times we/us/our appears"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Out-Group Words"
          value={outGroupWords.toLocaleString()}
          sublabel="Times they/them/their appears"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="In-Group Posts"
          value={identity?.in_group_posts?.toLocaleString() ?? "-"}
          sublabel='Posts leaning toward "us" language'
          rightSlot={renderExploreButton(() =>
            onExplore(buildIdentityBucketSpec("in")),
          )}
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Out-Group Posts"
          value={identity?.out_group_posts?.toLocaleString() ?? "-"}
          sublabel='Posts leaning toward "them" language'
          rightSlot={renderExploreButton(() =>
            onExplore(buildIdentityBucketSpec("out")),
          )}
          style={{ gridColumn: "span 3" }}
        />

        <Card
          label="Balanced Posts"
          value={identity?.tie_posts?.toLocaleString() ?? "-"}
          sublabel="Posts with equal us/them signals"
          rightSlot={renderExploreButton(() =>
            onExplore(buildIdentityBucketSpec("tie")),
          )}
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Total Group Words"
          value={totalGroupWords.toLocaleString()}
          sublabel="In-group + out-group words"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="In-Group Share"
          value={
            inGroupWordRate === null ? "-" : `${inGroupWordRate.toFixed(2)}%`
          }
          sublabel="Share of all words"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Out-Group Share"
          value={
            outGroupWordRate === null ? "-" : `${outGroupWordRate.toFixed(2)}%`
          }
          sublabel="Share of all words"
          style={{ gridColumn: "span 3" }}
        />

        <Card
          label="Hedging Words"
          value={stance?.hedge_total?.toLocaleString() ?? "-"}
          sublabel={
            typeof stance?.hedge_per_1k_tokens === "number"
              ? `${stance.hedge_per_1k_tokens.toFixed(1)} per 1k words`
              : "Word frequency"
          }
          rightSlot={renderExploreButton(() => onExplore(buildHedgeSpec()))}
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Certainty Words"
          value={stance?.certainty_total?.toLocaleString() ?? "-"}
          sublabel={
            typeof stance?.certainty_per_1k_tokens === "number"
              ? `${stance.certainty_per_1k_tokens.toFixed(1)} per 1k words`
              : "Word frequency"
          }
          rightSlot={renderExploreButton(() => onExplore(buildCertaintySpec()))}
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Need/Should Words"
          value={stance?.deontic_total?.toLocaleString() ?? "-"}
          sublabel={
            typeof stance?.deontic_per_1k_tokens === "number"
              ? `${stance.deontic_per_1k_tokens.toFixed(1)} per 1k words`
              : "Word frequency"
          }
          rightSlot={renderExploreButton(() => onExplore(buildDeonticSpec()))}
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Permission Words"
          value={stance?.permission_total?.toLocaleString() ?? "-"}
          sublabel={
            typeof stance?.permission_per_1k_tokens === "number"
              ? `${stance.permission_per_1k_tokens.toFixed(1)} per 1k words`
              : "Word frequency"
          }
          rightSlot={renderExploreButton(() => onExplore(buildPermissionSpec()))}
          style={{ gridColumn: "span 3" }}
        />

        <div style={{ ...styles.card, gridColumn: "span 6" }}>
          <h2 style={styles.sectionTitle}>Mood in "Us" Posts</h2>
          <p style={styles.sectionSubtitle}>
            Most likely emotion when in-group wording is stronger.
          </p>
          <div style={styles.topUserName}>{topEmotion(identity?.in_group_emotion_avg)}</div>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => onExplore(buildIdentityBucketSpec("in"))}
              style={styles.buttonSecondary}
            >
              Explore records
            </button>
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 6" }}>
          <h2 style={styles.sectionTitle}>Mood in "Them" Posts</h2>
          <p style={styles.sectionSubtitle}>
            Most likely emotion when out-group wording is stronger.
          </p>
          <div style={styles.topUserName}>{topEmotion(identity?.out_group_emotion_avg)}</div>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => onExplore(buildIdentityBucketSpec("out"))}
              style={styles.buttonSecondary}
            >
              Explore records
            </button>
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 12" }}>
          <h2 style={styles.sectionTitle}>Entity Mood Snapshot</h2>
          <p style={styles.sectionSubtitle}>
            Most mentioned entities and the mood that appears most with each.
          </p>
          {!entities.length ? (
            <div style={styles.topUserMeta}>No entity-level cultural data available.</div>
          ) : (
            <div
              style={{
                ...styles.topUsersList,
                maxHeight: 420,
                overflowY: "auto",
              }}
            >
              {entities.map(([entity, aggregate]) => (
                <div
                  key={entity}
                  style={{ ...styles.topUserItem, cursor: "pointer" }}
                  onClick={() => onExplore(buildEntitySpec(entity))}
                >
                  <div style={styles.topUserName}>{entity}</div>
                  <div style={styles.topUserMeta}>
                    {aggregate.post_count.toLocaleString()} posts • Likely mood:{" "}
                    {topEmotion(aggregate.emotion_avg)}
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
