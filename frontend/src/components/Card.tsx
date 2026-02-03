import type { CSSProperties } from "react";

const Card = (props: {
  label: string;
  value: string | number;
  sublabel?: string;
  rightSlot?: React.ReactNode;
  style?: CSSProperties
}) => {
  return (
    <div style={{
        background: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(15,23,42,0.08)",
        borderRadius: 16,
        padding: 14,
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        minHeight: 88,
        ...props.style
    }}>
      <div style={ {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
    }}>
        <div style={{   
            fontSize: 12,
            fontWeight: 700,
            color: "rgba(15, 23, 42, 0.65)",
            letterSpacing: "0.02em",
            textTransform: "uppercase"
            }}>
                {props.label}
        </div>
        {props.rightSlot ? <div>{props.rightSlot}</div> : null}
      </div>
      <div style={{
            fontSize: 22,
            fontWeight: 850,
            marginTop: 6,
            letterSpacing: "-0.02em",
        }}>{props.value}</div>
      {props.sublabel ? <div style={{
            marginTop: 6,
            fontSize: 12,
            color: "rgba(15, 23, 42, 0.55)",
        }}>{props.sublabel}</div> : null}
    </div>
  );
}

export default Card;