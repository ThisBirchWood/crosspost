import ForceGraph3D from "react-force-graph-3d";

import {
    type UserAnalysisResponse,
    type InteractionGraph
} from '../types/ApiTypes';

import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;

function ApiToGraphData(apiData: InteractionGraph) {
    const nodes = Object.keys(apiData).map(username => ({ id: username }));
    const links = [];
    
    for (const [source, targets] of Object.entries(apiData)) {
        for (const [target, count] of Object.entries(targets)) {
            links.push({ source, target, value: count });
        }
    }
    
    return { nodes, links };
}


const InteractionStats = (props: { data: UserAnalysisResponse }) => {
  const graphData = ApiToGraphData(props.data.interaction_graph);

  return (
    <div style={styles.page}>
        <h2 style={styles.sectionTitle}>User Interaction Graph</h2>
        <p style={styles.sectionSubtitle}>
            This graph visualizes interactions between users based on comments and replies. 
            Nodes represent users, and edges represent interactions (e.g., comments or replies) between them.
        </p>
        <div style={{ height: "600px", border: "1px solid #ccc", borderRadius: 8, marginTop: 16 }}>
            <ForceGraph3D
                graphData={graphData}
                nodeAutoColorBy="id"
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkWidth={(link) => Math.sqrt(link.value)}
                nodeLabel={(node) => `${node.id}`}
            />
        </div>
    </div>
  );
}

export default InteractionStats;