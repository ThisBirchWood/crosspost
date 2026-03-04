import { palette } from "./palette";
import type { StyleMap } from "./types";

export const feedbackStyles: StyleMap = {
  loadingPage: {
    width: "100%",
    minHeight: "100vh",
    padding: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingCard: {
    width: "min(560px, 92vw)",
    background: palette.surface,
    border: `1px solid ${palette.borderDefault}`,
    borderRadius: 8,
    boxShadow: `0 1px 0 ${palette.shadowSubtle}`,
    padding: 20,
  },

  loadingHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  loadingSpinner: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: `2px solid ${palette.borderDefault}`,
    borderTopColor: palette.brandGreen,
    animation: "stats-spin 0.9s linear infinite",
    flexShrink: 0,
  },

  loadingTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: palette.textPrimary,
  },

  loadingSubtitle: {
    margin: "6px 0 0",
    fontSize: 13,
    color: palette.textSecondary,
  },

  loadingSkeleton: {
    marginTop: 16,
    display: "grid",
    gap: 8,
  },

  loadingSkeletonLine: {
    height: 9,
    borderRadius: 999,
    background: palette.canvas,
    animation: "stats-pulse 1.25s ease-in-out infinite",
  },

  loadingSkeletonLineLong: {
    width: "100%",
  },

  loadingSkeletonLineMed: {
    width: "78%",
  },

  loadingSkeletonLineShort: {
    width: "62%",
  },

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
