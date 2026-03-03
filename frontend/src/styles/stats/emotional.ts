import { palette } from "./palette";
import type { StyleMap } from "./types";

export const emotionalStyles: StyleMap = {
  emotionalSummaryRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    fontSize: 13,
    color: palette.textTertiary,
    marginTop: 6,
  },

  emotionalTopicLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: palette.textSecondary,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },

  emotionalTopicValue: {
    fontSize: 24,
    fontWeight: 800,
    marginTop: 4,
    lineHeight: 1.2,
  },

  emotionalMetricRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    fontSize: 13,
    color: palette.textSecondary,
  },

  emotionalMetricRowCompact: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    fontSize: 13,
    color: palette.textSecondary,
  },

  emotionalMetricValue: {
    fontWeight: 600,
    color: palette.textPrimary,
  },
};
