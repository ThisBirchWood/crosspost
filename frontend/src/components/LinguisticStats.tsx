import Card from "./Card";
import StatsStyling from "../styles/stats_styling";
import type { LinguisticAnalysisResponse } from "../types/ApiTypes";

const styles = StatsStyling;

type LinguisticStatsProps = {
  data: LinguisticAnalysisResponse;
};

const LinguisticStats = ({ data }: LinguisticStatsProps) => {
  const lexical = data.lexical_diversity;
  const words = data.word_frequencies ?? [];
  const bigrams = data.common_two_phrases ?? [];
  const trigrams = data.common_three_phrases ?? [];

  const topWords = words.slice(0, 20);
  const topBigrams = bigrams.slice(0, 10);
  const topTrigrams = trigrams.slice(0, 10);

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, ...styles.grid }}>
        <Card
          label="Total Tokens"
          value={lexical?.total_tokens?.toLocaleString() ?? "—"}
          sublabel="After token filtering"
          style={{ gridColumn: "span 4" }}
        />
        <Card
          label="Unique Tokens"
          value={lexical?.unique_tokens?.toLocaleString() ?? "—"}
          sublabel="Distinct vocabulary items"
          style={{ gridColumn: "span 4" }}
        />
        <Card
          label="Type-Token Ratio"
          value={typeof lexical?.ttr === "number" ? lexical.ttr.toFixed(4) : "—"}
          sublabel="Vocabulary richness proxy"
          style={{ gridColumn: "span 4" }}
        />

        <div style={{ ...styles.card, gridColumn: "span 4" }}>
          <h2 style={styles.sectionTitle}>Top Words</h2>
          <p style={styles.sectionSubtitle}>Most frequent filtered terms.</p>
          <div style={{ ...styles.topUsersList, maxHeight: 360, overflowY: "auto" }}>
            {topWords.map((item) => (
              <div key={item.word} style={styles.topUserItem}>
                <div style={styles.topUserName}>{item.word}</div>
                <div style={styles.topUserMeta}>{item.count.toLocaleString()} uses</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 4" }}>
          <h2 style={styles.sectionTitle}>Top Bigrams</h2>
          <p style={styles.sectionSubtitle}>Most frequent 2-word phrases.</p>
          <div style={{ ...styles.topUsersList, maxHeight: 360, overflowY: "auto" }}>
            {topBigrams.map((item) => (
              <div key={item.ngram} style={styles.topUserItem}>
                <div style={styles.topUserName}>{item.ngram}</div>
                <div style={styles.topUserMeta}>{item.count.toLocaleString()} uses</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 4" }}>
          <h2 style={styles.sectionTitle}>Top Trigrams</h2>
          <p style={styles.sectionSubtitle}>Most frequent 3-word phrases.</p>
          <div style={{ ...styles.topUsersList, maxHeight: 360, overflowY: "auto" }}>
            {topTrigrams.map((item) => (
              <div key={item.ngram} style={styles.topUserItem}>
                <div style={styles.topUserName}>{item.ngram}</div>
                <div style={styles.topUserMeta}>{item.count.toLocaleString()} uses</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinguisticStats;
