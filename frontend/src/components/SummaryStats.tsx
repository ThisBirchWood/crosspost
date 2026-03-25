import { useState } from "react";
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
import UserModal from "../components/UserModal";

import {
  type SummaryResponse,
  type FrequencyWord,
  type UserAnalysisResponse,
  type TimeAnalysisResponse,
  type ContentAnalysisResponse,
  type User,
} from "../types/ApiTypes";

const styles = StatsStyling;

type SummaryStatsProps = {
  userData: UserAnalysisResponse | null;
  timeData: TimeAnalysisResponse | null;
  contentData: ContentAnalysisResponse | null;
  summary: SummaryResponse | null;
};

function formatDateRange(startUnix: number, endUnix: number) {
  const start = new Date(startUnix * 1000);
  const end = new Date(endUnix * 1000);

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

  return `${fmt(start)} → ${fmt(end)}`;
}

function convertFrequencyData(data: FrequencyWord[]) {
  return data.map((d: FrequencyWord) => ({
    text: d.word,
    value: d.count,
  }));
}

const SummaryStats = ({
  userData,
  timeData,
  contentData,
  summary,
}: SummaryStatsProps) => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const selectedUserData: User | null =
    userData?.users.find((u) => u.author === selectedUser) ?? null;

  return (
    <div style={styles.page}>
      {/* main grid*/}
      <div style={{ ...styles.container, ...styles.grid }}>
        <Card
          label="Total Activity"
          value={summary?.total_events ?? "—"}
          sublabel="Posts + comments"
          style={{
            gridColumn: "span 4",
          }}
        />
        <Card
          label="Active People"
          value={summary?.unique_users ?? "—"}
          sublabel="Distinct users"
          style={{
            gridColumn: "span 4",
          }}
        />
        <Card
          label="Posts vs Comments"
          value={
            summary ? `${summary.total_posts} / ${summary.total_comments}` : "—"
          }
          sublabel={`Comments per post: ${summary?.comments_per_post ?? "—"}`}
          style={{
            gridColumn: "span 4",
          }}
        />

        <Card
          label="Time Range"
          value={
            summary?.time_range
              ? formatDateRange(
                  summary.time_range.start,
                  summary.time_range.end,
                )
              : "—"
          }
          sublabel="Based on dataset timestamps"
          style={{
            gridColumn: "span 4",
          }}
        />

        <Card
          label="One-Time Users"
          value={
            typeof summary?.lurker_ratio === "number"
              ? `${Math.round(summary.lurker_ratio * 100)}%`
              : "—"
          }
          sublabel="Users with only one event"
          style={{
            gridColumn: "span 4",
          }}
        />

        <Card
          label="Sources"
          value={summary?.sources?.length ?? "—"}
          sublabel={
            summary?.sources?.length
              ? summary.sources.slice(0, 3).join(", ") +
                (summary.sources.length > 3 ? "…" : "")
              : "—"
          }
          style={{
            gridColumn: "span 4",
          }}
        />

        {/* events per day */}
        <div style={{ ...styles.card, gridColumn: "span 5" }}>
          <h2 style={styles.sectionTitle}>Activity Over Time</h2>
          <p style={styles.sectionSubtitle}>
            How much posting happened each day.
          </p>

          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData?.events_per_day ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="Events" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Word Cloud */}
        <div style={{ ...styles.card, gridColumn: "span 4" }}>
          <h2 style={styles.sectionTitle}>Common Words</h2>
          <p style={styles.sectionSubtitle}>
            Frequently used words across the dataset.
          </p>

          <div style={styles.chartWrapper}>
            <ReactWordcloud
              words={convertFrequencyData(contentData?.word_frequencies ?? [])}
              options={{
                rotations: 2,
                rotationAngles: [0, 90],
                fontSizes: [14, 60],
                enableTooltip: true,
              }}
            />
          </div>
        </div>

        {/* Top Users */}
        <div
          style={{ ...styles.card, ...styles.scrollArea, gridColumn: "span 3" }}
        >
          <h2 style={styles.sectionTitle}>Most Active Users</h2>
          <p style={styles.sectionSubtitle}>Who posted the most events.</p>

          <div style={styles.topUsersList}>
            {userData?.top_users.slice(0, 100).map((item) => (
              <div
                key={`${item.author}-${item.source}`}
                style={{ ...styles.topUserItem, cursor: "pointer" }}
                onClick={() => setSelectedUser(item.author)}
              >
                <div style={styles.topUserName}>{item.author}</div>
                <div style={styles.topUserMeta}>
                  {item.source} • {item.count} events
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap */}
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

      <UserModal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        username={selectedUser ?? ""}
        userData={selectedUserData}
      />
    </div>
  );
};

export default SummaryStats;
