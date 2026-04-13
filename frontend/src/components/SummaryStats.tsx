import { memo, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import ActivityHeatmap from "../stats/ActivityHeatmap";
import { ReactWordcloud } from "@cp949/react-wordcloud";
import StatsStyling from "../styles/stats_styling";
import Card from "../components/Card";

import {
  type SummaryResponse,
  type FrequencyWord,
  type UserEndpointResponse,
  type TimeAnalysisResponse,
  type LinguisticAnalysisResponse,
} from "../types/ApiTypes";
import {
  buildAllRecordsSpec,
  buildDateBucketSpec,
  buildOneTimeUsersSpec,
  buildUserSpec,
  type CorpusExplorerSpec,
} from "../utils/corpusExplorer";

const styles = StatsStyling;
const MAX_WORDCLOUD_WORDS = 250;
const exploreButtonStyle = { padding: "4px 8px", fontSize: 12 };

const WORDCLOUD_OPTIONS = {
  rotations: 2,
  rotationAngles: [0, 90] as [number, number],
  fontSizes: [14, 60] as [number, number],
  enableTooltip: true,
};

type SummaryStatsProps = {
  userData: UserEndpointResponse | null;
  timeData: TimeAnalysisResponse | null;
  linguisticData: LinguisticAnalysisResponse | null;
  summary: SummaryResponse | null;
  onExplore: (spec: CorpusExplorerSpec) => void;
};

type WordCloudPanelProps = {
  words: { text: string; value: number }[];
};

const WordCloudPanel = memo(({ words }: WordCloudPanelProps) => (
  <ReactWordcloud words={words} options={WORDCLOUD_OPTIONS} />
));

function formatDateRange(startUnix: number, endUnix: number) {
  const start = new Date(startUnix * 1000);
  const end = new Date(endUnix * 1000);

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

  return `${fmt(start)} -> ${fmt(end)}`;
}

function convertFrequencyData(data: FrequencyWord[]) {
  return data.map((d: FrequencyWord) => ({
    text: d.word,
    value: d.count,
  }));
}

const renderExploreButton = (onClick: () => void) => (
  <button
    onClick={onClick}
    style={{ ...styles.buttonSecondary, ...exploreButtonStyle }}
  >
    Explore
  </button>
);

const SummaryStats = ({
  userData,
  timeData,
  linguisticData,
  summary,
  onExplore,
}: SummaryStatsProps) => {
  const wordCloudWords = useMemo(
    () =>
      convertFrequencyData(
        (linguisticData?.word_frequencies ?? []).slice(0, MAX_WORDCLOUD_WORDS),
      ),
    [linguisticData?.word_frequencies],
  );

  const topUsersPreview = useMemo(
    () => (userData?.top_users ?? []).slice(0, 100),
    [userData?.top_users],
  );

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, ...styles.grid }}>
        <Card
          label="Total Activity"
          value={summary?.total_events ?? "-"}
          sublabel="Posts + comments"
          rightSlot={renderExploreButton(() => onExplore(buildAllRecordsSpec()))}
          style={{ gridColumn: "span 4" }}
        />
        <Card
          label="Active People"
          value={summary?.unique_users ?? "-"}
          sublabel="Distinct users"
          rightSlot={renderExploreButton(() => onExplore(buildAllRecordsSpec()))}
          style={{ gridColumn: "span 4" }}
        />
        <Card
          label="Posts vs Comments"
          value={
            summary ? `${summary.total_posts} / ${summary.total_comments}` : "-"
          }
          sublabel={`Comments per post: ${summary?.comments_per_post ?? "-"}`}
          rightSlot={renderExploreButton(() => onExplore(buildAllRecordsSpec()))}
          style={{ gridColumn: "span 4" }}
        />

        <Card
          label="Time Range"
          value={
            summary?.time_range
              ? formatDateRange(summary.time_range.start, summary.time_range.end)
              : "-"
          }
          sublabel="Based on dataset timestamps"
          rightSlot={renderExploreButton(() => onExplore(buildAllRecordsSpec()))}
          style={{ gridColumn: "span 4" }}
        />

        <Card
          label="One-Time Users"
          value={
            typeof summary?.lurker_ratio === "number"
              ? `${Math.round(summary.lurker_ratio * 100)}%`
              : "-"
          }
          sublabel="Users with only one event"
          rightSlot={renderExploreButton(() => onExplore(buildOneTimeUsersSpec()))}
          style={{ gridColumn: "span 4" }}
        />

        <Card
          label="Sources"
          value={summary?.sources?.length ?? "-"}
          sublabel={
            summary?.sources?.length
              ? summary.sources.slice(0, 3).join(", ") +
                (summary.sources.length > 3 ? "..." : "")
              : "-"
          }
          rightSlot={renderExploreButton(() => onExplore(buildAllRecordsSpec()))}
          style={{ gridColumn: "span 4" }}
        />

        <div style={{ ...styles.card, gridColumn: "span 5" }}>
          <h2 style={styles.sectionTitle}>Activity Over Time</h2>
          <p style={styles.sectionSubtitle}>How much posting happened each day.</p>

          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeData?.events_per_day ?? []}
                onClick={(state: unknown) => {
                  const payload = (state as { activePayload?: Array<{ payload?: { date?: string } }> })
                    ?.activePayload?.[0]?.payload as
                    | { date?: string }
                    | undefined;
                  if (payload?.date) {
                    onExplore(buildDateBucketSpec(String(payload.date)));
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Events"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 4" }}>
          <h2 style={styles.sectionTitle}>Common Words</h2>
          <p style={styles.sectionSubtitle}>
            Frequently used words across the dataset.
          </p>

          <div style={styles.chartWrapper}>
            <WordCloudPanel words={wordCloudWords} />
          </div>
        </div>

        <div
          style={{ ...styles.card, ...styles.scrollArea, gridColumn: "span 3" }}
        >
          <h2 style={styles.sectionTitle}>Most Active Users</h2>
          <p style={styles.sectionSubtitle}>Who posted the most events.</p>

          <div style={styles.topUsersList}>
            {topUsersPreview.map((item) => (
              <div
                key={`${item.author}-${item.source}`}
                style={{ ...styles.topUserItem, cursor: "pointer" }}
                onClick={() => onExplore(buildUserSpec(item.author))}
              >
                <div style={styles.topUserName}>{item.author}</div>
                <div style={styles.topUserMeta}>
                  {item.source} • {item.count} events
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 12" }}>
          <h2 style={styles.sectionTitle}>Weekly Activity Pattern</h2>
          <p style={styles.sectionSubtitle}>
            When activity tends to happen by weekday and hour.
          </p>

          <div style={styles.heatmapWrapper}>
            <ActivityHeatmap data={timeData?.weekday_hour_heatmap ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryStats;
