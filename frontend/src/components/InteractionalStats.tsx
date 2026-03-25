import Card from "./Card";
import StatsStyling from "../styles/stats_styling";
import type { InteractionAnalysisResponse } from "../types/ApiTypes";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const styles = StatsStyling;

type InteractionalStatsProps = {
  data: InteractionAnalysisResponse;
};

const InteractionalStats = ({ data }: InteractionalStatsProps) => {
  const graph = data.interaction_graph ?? {};
  const userCount = Object.keys(graph).length;
  const edges = Object.values(graph).flatMap((targets) =>
    Object.values(targets),
  );
  const edgeCount = edges.length;
  const interactionVolume = edges.reduce((sum, value) => sum + value, 0);
  const concentration = data.conversation_concentration;
  const topTenCommentShare =
    typeof concentration?.top_10pct_comment_share === "number"
      ? concentration?.top_10pct_comment_share
      : null;
  const topTenAuthorCount =
    typeof concentration?.top_10pct_author_count === "number"
      ? concentration.top_10pct_author_count
      : null;
  const totalCommentingAuthors =
    typeof concentration?.total_commenting_authors === "number"
      ? concentration.total_commenting_authors
      : null;
  const singleCommentAuthorRatio =
    typeof concentration?.single_comment_author_ratio === "number"
      ? concentration.single_comment_author_ratio
      : null;
  const singleCommentAuthors =
    typeof concentration?.single_comment_authors === "number"
      ? concentration.single_comment_authors
      : null;

  const topPairs = (data.top_interaction_pairs ?? [])
    .filter((item): item is [[string, string], number] => {
      if (!Array.isArray(item) || item.length !== 2) {
        return false;
      }

      const pair = item[0];
      const count = item[1];

      return (
        Array.isArray(pair) &&
        pair.length === 2 &&
        typeof pair[0] === "string" &&
        typeof pair[1] === "string" &&
        typeof count === "number"
      );
    })
    .slice(0, 20);

  const topPairChartData = topPairs
    .slice(0, 8)
    .map(([[source, target], value], index) => ({
      pair: `${source} -> ${target}`,
      replies: value,
      rank: index + 1,
    }));

  const topTenSharePercent =
    topTenCommentShare === null ? null : topTenCommentShare * 100;
  const nonTopTenSharePercent =
    topTenSharePercent === null ? null : Math.max(0, 100 - topTenSharePercent);

  let concentrationPieData: { name: string; value: number }[] = [];
  if (topTenSharePercent !== null && nonTopTenSharePercent !== null) {
    concentrationPieData = [
      { name: "Top 10% authors", value: topTenSharePercent },
      { name: "Other authors", value: nonTopTenSharePercent },
    ];
  }

  const PIE_COLORS = ["#2b6777", "#c8d8e4"];

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, ...styles.grid }}>
        <div style={{ ...styles.card, gridColumn: "span 12" }}>
          <h2 style={styles.sectionTitle}>Conversation Overview</h2>
          <p style={styles.sectionSubtitle}>
            Who talks to who, and how concentrated the replies are.
          </p>
        </div>

        <Card
          label="Average Reply Depth"
          value={
            typeof data.average_thread_depth === "number"
              ? data.average_thread_depth.toFixed(2)
              : "—"
          }
          sublabel="How deep reply chains usually go"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Users in Network"
          value={userCount.toLocaleString()}
          sublabel="Users in the reply graph"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="User-to-User Links"
          value={edgeCount.toLocaleString()}
          sublabel="Unique reply directions"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Total Replies"
          value={interactionVolume.toLocaleString()}
          sublabel="All reply links combined"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Concentrated Replies"
          value={
            topTenSharePercent === null
              ? "-"
              : `${topTenSharePercent.toFixed(1)}%`
          }
          sublabel={
            topTenAuthorCount === null || totalCommentingAuthors === null
              ? "Reply share from the top 10% commenters"
              : `${topTenAuthorCount.toLocaleString()} of ${totalCommentingAuthors.toLocaleString()} authors`
          }
          style={{ gridColumn: "span 6" }}
        />
        <Card
          label="Single-Comment Authors"
          value={
            singleCommentAuthorRatio === null
              ? "-"
              : `${(singleCommentAuthorRatio * 100).toFixed(1)}%`
          }
          sublabel={
            singleCommentAuthors === null
              ? "Authors who commented exactly once"
              : `${singleCommentAuthors.toLocaleString()} authors commented exactly once`
          }
          style={{ gridColumn: "span 6" }}
        />

        <div style={{ ...styles.card, gridColumn: "span 12" }}>
          <h2 style={styles.sectionTitle}>Conversation Visuals</h2>
          <p style={styles.sectionSubtitle}>
            Main reply links and concentration split.
          </p>

          <div style={{ ...styles.grid, marginTop: 12 }}>
            <div style={{ ...styles.cardBase, gridColumn: "span 6" }}>
              <h3 style={{ ...styles.sectionTitle, fontSize: "1rem" }}>
                Top Interaction Pairs
              </h3>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={topPairChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="rank"
                      tickFormatter={(value) => `#${value}`}
                      width={36}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="replies"
                      fill="#2b6777"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ ...styles.cardBase, gridColumn: "span 6" }}>
              <h3 style={{ ...styles.sectionTitle, fontSize: "1rem" }}>
                Top 10% vs Other Comment Share
              </h3>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={concentrationPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {concentrationPieData.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 12" }}>
          <h2 style={styles.sectionTitle}>Frequent Reply Paths</h2>
          <p style={styles.sectionSubtitle}>
            Most common user-to-user reply paths.
          </p>
          {!topPairs.length ? (
            <div style={styles.topUserMeta}>
              No interaction pair data available.
            </div>
          ) : (
            <div
              style={{
                ...styles.topUsersList,
                maxHeight: 420,
                overflowY: "auto",
              }}
            >
              {topPairs.map(([[source, target], value], index) => (
                <div
                  key={`${source}->${target}-${index}`}
                  style={styles.topUserItem}
                >
                  <div style={styles.topUserName}>
                    {source} -&gt; {target}
                  </div>
                  <div style={styles.topUserMeta}>
                    {value.toLocaleString()} replies
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

export default InteractionalStats;
