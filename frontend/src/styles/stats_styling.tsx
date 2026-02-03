import type { CSSProperties } from "react";

const StatsStyling: Record<string, CSSProperties> = {
  page: {
    width: "100%",
    minHeight: "100vh",
    padding: 24,
    background: "#f6f7fb",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Arial, sans-serif',
    color: "#111827",
    overflowX: "hidden",
    boxSizing: "border-box"
  },


  container: {
    maxWidth: 1400,
    margin: "0 auto",
  },

  card: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
  },

  headerBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  controls: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  input: {
    width: 320,
    maxWidth: "70vw",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    outline: "none",
    fontSize: 14,
    background: "#fff",
    color: "black"
  },

  buttonPrimary: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#2563eb",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(37,99,235,0.25)",
  },

  buttonSecondary: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    color: "#111827",
    fontWeight: 600,
    cursor: "pointer",
  },

  grid: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: 16,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
  },

  sectionSubtitle: {
    margin: "6px 0 14px",
    fontSize: 13,
    color: "#6b7280",
  },

  chartWrapper: {
    width: "100%",
    height: 350,
  },

  heatmapWrapper: {
    width: "100%",
    height: 320,
  },

  topUsersList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  topUserItem: {
    padding: "10px 12px",
    borderRadius: 12,
    background: "#f9fafb",
    border: "1px solid rgba(0,0,0,0.06)",
  },

  topUserName: {
    fontWeight: 700,
    fontSize: 14,
  },

  topUserMeta: {
    fontSize: 13,
    color: "#6b7280",
  },

  scrollArea: {
    maxHeight: 450,
    overflowY: "auto",
  },
};

export default StatsStyling;