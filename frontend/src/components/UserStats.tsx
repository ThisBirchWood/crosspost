import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";

import {
    type UserAnalysisResponse,
    type InteractionGraph
} from '../types/ApiTypes';

import StatsStyling from "../styles/stats_styling";
import Card from "./Card";

const styles = StatsStyling;

type GraphLink = {
    source: string;
    target: string;
    value: number;
};

function ApiToGraphData(apiData: InteractionGraph) {
    const nodes = Object.keys(apiData).map(username => ({ id: username }));
    const links: GraphLink[] = [];
    
    for (const [source, targets] of Object.entries(apiData)) {
        for (const [target, count] of Object.entries(targets)) {
            links.push({ source, target, value: count });
        }
    }
    
    // drop low-value and deleted interactions to reduce clutter
    const filteredLinks = links.filter(link => 
        link.value >= 2 && 
        link.source !== "[deleted]" && 
        link.target !== "[deleted]"
    );

    // also filter out nodes that are no longer connected after link filtering
    const connectedNodeIds = new Set(filteredLinks.flatMap(link => [link.source, link.target]));
    const filteredNodes = nodes.filter(node => connectedNodeIds.has(node.id));

    return { nodes: filteredNodes, links: filteredLinks};
}


const UserStats = (props: { data: UserAnalysisResponse }) => {
  const graphData = useMemo(() => ApiToGraphData(props.data.interaction_graph), [props.data.interaction_graph]);
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

  const totalUsers = props.data.users.length;
  const connectedUsers = graphData.nodes.length;
  const totalInteractions = graphData.links.reduce((sum, link) => sum + link.value, 0);
  const avgInteractionsPerConnectedUser = connectedUsers ? totalInteractions / connectedUsers : 0;

  const strongestLink = graphData.links.reduce<GraphLink | null>((best, current) => {
    if (!best || current.value > best.value) {
      return current;
    }
    return best;
  }, null);

  const highlyInteractiveUser = [...props.data.users].sort((a, b) => b.comment_share - a.comment_share)[0];

  const mostActiveUser = props.data.top_users.find(u => u.author !== "[deleted]");

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
            label="Interactions"
            value={totalInteractions.toLocaleString()}
            sublabel="Filtered links (2+ interactions)"
            style={{ gridColumn: "span 3" }}
          />
          <Card
            label="Average Intensity"
            value={avgInteractionsPerConnectedUser.toFixed(1)}
            sublabel="Interactions per connected user"
            style={{ gridColumn: "span 3" }}
          />
          <Card
            label="Most Active User"
            value={mostActiveUser?.author ?? "—"}
            sublabel={mostActiveUser ? `${mostActiveUser.count.toLocaleString()} events` : "No user activity found"}
            style={{ gridColumn: "span 3" }}
          />

          <Card
            label="Strongest Connection"
            value={strongestLink ? `${strongestLink.source} -> ${strongestLink.target}` : "—"}
            sublabel={strongestLink ? `${strongestLink.value.toLocaleString()} interactions` : "No graph edges after filtering"}
            style={{ gridColumn: "span 6" }}
          />
          <Card
            label="Most Reply-Driven User"
            value={highlyInteractiveUser?.author ?? "—"}
            sublabel={
              highlyInteractiveUser
                ? `${Math.round(highlyInteractiveUser.comment_share * 100)}% comments`
                : "No user distribution available"
            }
            style={{ gridColumn: "span 6" }}
          />

          <div style={{ ...styles.card, gridColumn: "span 12" }}>
            <h2 style={styles.sectionTitle}>User Interaction Graph</h2>
            <p style={styles.sectionSubtitle}>
              Nodes represent users and links represent conversation interactions.
            </p>
            <div ref={graphContainerRef} style={{ width: "100%", height: graphSize.height }}>
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
}

export default UserStats;
