import type { CSSProperties } from "react";
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;

const Card = (props: {
  label: string;
  value: string | number;
  sublabel?: string;
  rightSlot?: React.ReactNode;
  style?: CSSProperties;
}) => {
  return (
    <div style={{ ...styles.cardBase, ...props.style }}>
      <div style={styles.cardTopRow}>
        <div style={styles.cardLabel}>{props.label}</div>
        {props.rightSlot ? <div>{props.rightSlot}</div> : null}
      </div>
      <div style={styles.cardValue}>{props.value}</div>
      {props.sublabel ? (
        <div style={styles.cardSubLabel}>{props.sublabel}</div>
      ) : null}
    </div>
  );
};

export default Card;
