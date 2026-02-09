import type { ContentAnalysisResponse } from "../types/ApiTypes"
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;

type EmotionalStatsProps = {
    contentData: ContentAnalysisResponse;
}

const EmotionalStats = ({contentData}: EmotionalStatsProps) => {
    return (
        <div style={styles.page}>
            <p>lol</p>
        </div>
    )
}

export default EmotionalStats;