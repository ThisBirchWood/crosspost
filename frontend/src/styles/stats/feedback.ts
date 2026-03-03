import { palette } from "./palette";
import type { StyleMap } from "./types";

export const feedbackStyles: StyleMap = {
  alertCardError: {
    borderColor: palette.alertErrorBorder,
    background: palette.alertErrorBg,
    color: palette.alertErrorText,
    fontSize: 14,
  },

  alertCardInfo: {
    borderColor: palette.alertInfoBorder,
    background: palette.surface,
    color: palette.textBody,
    fontSize: 14,
  },

  statusMessageCard: {
    marginTop: 12,
    boxShadow: "none",
  },

  dashboardMeta: {
    fontSize: 13,
    color: palette.textSecondary,
  },

  tabsRow: {
    display: "flex",
    gap: 8,
    marginTop: 12,
  },
};
