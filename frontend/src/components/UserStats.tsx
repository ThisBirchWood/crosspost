import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";

import { type TopUser, type InteractionGraph } from "../types/ApiTypes";

import StatsStyling from "../styles/stats_styling";
import Card from "./Card";

const styles = StatsStyling;

type GraphLink = {
  source: string;
  target: string;
  value: number;
};

function ApiToGraphData(apiData: InteractionGraph) {
  const links: GraphLink[] = [];
  const connectedNodeIds = new Set<string>();

  for (const [source, targets] of Object.entries(apiData)) {
    for (const [target, count] of Object.entries(targets)) {
      if (count < 2 || source === "[deleted]" || target === "[deleted]") {
        continue;
      }
      links.push({ source, target, value: count });
      connectedNodeIds.add(source);
      connectedNodeIds.add(target);
    }
  }

  const filteredNodes = Array.from(connectedNodeIds, (id) => ({ id }));

  return { nodes: filteredNodes, links };
}

type UserStatsProps = {
  topUsers: TopUser[];
  interactionGraph: InteractionGraph;
  totalUsers: number;
  mostCommentHeavyUser: { author: string; commentShare: number } | null;
};

const UserStats = ({
  topUsers,
  interactionGraph,
  totalUsers,
  mostCommentHeavyUser,
}: UserStatsProps) => {
  const graphData = useMemo(
    () => ApiToGraphData(interactionGraph),
    [interactionGraph],
  );
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const [graphSize, setGraphSize] = useState({ width: 720, height: 540 });

  useEffect(() => {
    const updateGraphSize = () => {
      const containerWidth = graphContainerRef.current?.clientWidth ?? 720;
      const nextWidth = Math.max(320, Math.floor(containerWidth));
      const nextHeight = nextWidth < 700 ? 300 : 540;
      setGraphSize({ width: nextWidth, height: nextHeight });
    };

    updateGraphSize();
    window.addEventListener("resize", updateGraphSize);

    return () => window.removeEventListener("resize", updateGraphSize);
  }, []);

  const connectedUsers = graphData.nodes.length;
  const totalInteractions = graphData.links.reduce(
    (sum, link) => sum + link.value,
    0,
  );
  const avgInteractionsPerConnectedUser = connectedUsers
    ? totalInteractions / connectedUsers
    : 0;

  const strongestLink = graphData.links.reduce<GraphLink | null>(
    (best, current) => {
      if (!best || current.value > best.value) {
        return current;
      }
      return best;
    },
    null,
  );

  const mostActiveUser = topUsers.find(
    (u) => u.author !== "[deleted]",
  );

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, ...styles.grid }}>
        <Card
          label="Users"
          value={totalUsers.toLocaleString()}
          sublabel={`${connectedUsers.toLocaleString()} users in filtered graph`}
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Replies"
          value={totalInteractions.toLocaleString()}
          sublabel="Links with at least 2 replies"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Replies per Connected User"
          value={avgInteractionsPerConnectedUser.toFixed(1)}
          sublabel="Average from visible graph links"
          style={{ gridColumn: "span 3" }}
        />
        <Card
          label="Most Active User"
          value={mostActiveUser?.author ?? "—"}
          sublabel={
            mostActiveUser
              ? `${mostActiveUser.count.toLocaleString()} events`
              : "No user activity found"
          }
          style={{ gridColumn: "span 3" }}
        />

        <Card
          label="Strongest User Link"
          value={
            strongestLink
              ? `${strongestLink.source} -> ${strongestLink.target}`
              : "—"
          }
          sublabel={
            strongestLink
              ? `${strongestLink.value.toLocaleString()} replies`
              : "No graph links after filtering"
          }
          style={{ gridColumn: "span 6" }}
        />
        <Card
          label="Most Comment-Heavy User"
          value={mostCommentHeavyUser?.author ?? "—"}
          sublabel={
            mostCommentHeavyUser
              ? `${Math.round(mostCommentHeavyUser.commentShare * 100)}% comments`
              : "No user distribution available"
          }
          style={{ gridColumn: "span 6" }}
        />

        <div style={{ ...styles.card, gridColumn: "span 12" }}>
          <h2 style={styles.sectionTitle}>User Interaction Graph</h2>
          <p style={styles.sectionSubtitle}>
            Each node is a user, and each link shows replies between them.
          </p>
          <div
            ref={graphContainerRef}
            style={{ width: "100%", height: graphSize.height }}
          >
            <ForceGraph3D
              width={graphSize.width}
              height={graphSize.height}
              graphData={graphData}
              nodeAutoColorBy="id"
              linkDirectionalParticles={1}
              linkDirectionalParticleSpeed={0.004}
              linkWidth={(link) => Math.sqrt(Number(link.value))}
              nodeLabel={(node) => `${node.id}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStats;
