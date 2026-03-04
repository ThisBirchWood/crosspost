import { palette } from "./palette";
import type { StyleMap } from "./types";

export const foundationStyles: StyleMap = {
  appShell: {
    minHeight: "100vh",
    background: palette.canvas,
    fontFamily: '"IBM Plex Sans", "Noto Sans", "Liberation Sans", "Segoe UI", sans-serif',
    color: palette.textPrimary,
  },

  page: {
    width: "100%",
    minHeight: "100vh",
    padding: 20,
    background: palette.canvas,
    fontFamily: '"IBM Plex Sans", "Noto Sans", "Liberation Sans", "Segoe UI", sans-serif',
    color: palette.textPrimary,
    overflowX: "hidden",
    boxSizing: "border-box",
  },

  container: {
    maxWidth: 1240,
    margin: "0 auto",
  },

  containerWide: {
    maxWidth: 1100,
    margin: "0 auto",
  },

  containerNarrow: {
    maxWidth: 720,
    margin: "0 auto",
  },

  card: {
    background: palette.surface,
    borderRadius: 8,
    padding: 16,
    border: `1px solid ${palette.borderDefault}`,
    boxShadow: `0 1px 0 ${palette.shadowSubtle}`,
  },

  headerBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  controls: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },

  controlsWrapped: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },

  input: {
    width: 280,
    maxWidth: "70vw",
    padding: "8px 10px",
    borderRadius: 6,
    border: `1px solid ${palette.borderDefault}`,
    outline: "none",
    fontSize: 14,
    background: palette.surface,
    color: palette.textPrimary,
  },

  buttonPrimary: {
    padding: "8px 12px",
    borderRadius: 6,
    border: `1px solid ${palette.brandGreenBorder}`,
    background: palette.brandGreen,
    color: palette.surface,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "none",
  },

  buttonSecondary: {
    padding: "8px 12px",
    borderRadius: 6,
    border: `1px solid ${palette.borderDefault}`,
    background: palette.canvas,
    color: palette.textPrimary,
    fontWeight: 600,
    cursor: "pointer",
  },

  grid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: 12,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 600,
  },

  sectionSubtitle: {
    margin: "6px 0 14px",
    fontSize: 13,
    color: palette.textSecondary,
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
    borderRadius: 8,
    background: palette.canvas,
    border: `1px solid ${palette.borderMuted}`,
  },

  topUserName: {
    fontWeight: 600,
    fontSize: 14,
    color: palette.textPrimary,
  },

  topUserMeta: {
    fontSize: 13,
    color: palette.textSecondary,
  },

  scrollArea: {
    maxHeight: 420,
    overflowY: "auto",
  },
};
