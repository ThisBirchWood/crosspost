import { palette } from "./palette";
import type { StyleMap } from "./types";

export const cardStyles: StyleMap = {
  cardBase: {
    background: palette.surface,
    border: `1px solid ${palette.borderDefault}`,
    borderRadius: 8,
    padding: 14,
    boxShadow: `0 1px 0 ${palette.shadowSubtle}`,
    minHeight: 88,
  },

  cardTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  cardLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: palette.textSecondary,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },

  cardValue: {
    fontSize: 24,
    fontWeight: 700,
    marginTop: 6,
    letterSpacing: "-0.02em",
    color: palette.textPrimary,
  },

  cardSubLabel: {
    marginTop: 6,
    fontSize: 12,
    color: palette.textSecondary,
  },
};
