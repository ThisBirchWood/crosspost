import { palette } from "./palette";
import type { StyleMap } from "./types";

export const appLayoutStyles: StyleMap = {
  appHeaderWrap: {
    padding: "16px 24px 0",
  },

  appHeaderBrandRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  appTitle: {
    margin: 0,
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: 600,
  },

  authStatusBadge: {
    padding: "3px 8px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: '"IBM Plex Sans", "Noto Sans", "Liberation Sans", "Segoe UI", sans-serif',
  },

  authStatusSignedIn: {
    border: `1px solid ${palette.statusPositiveBorder}`,
    background: palette.statusPositiveBg,
    color: palette.statusPositiveText,
  },

  authStatusSignedOut: {
    border: `1px solid ${palette.statusNegativeBorder}`,
    background: palette.statusNegativeBg,
    color: palette.statusNegativeText,
  },
};
