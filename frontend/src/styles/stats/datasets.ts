import { palette } from "./palette";
import type { StyleMap } from "./types";

export const datasetStyles: StyleMap = {
  sectionHeaderTitle: {
    margin: 0,
    color: palette.textPrimary,
    fontSize: 28,
    fontWeight: 600,
  },

  sectionHeaderSubtitle: {
    margin: "8px 0 0",
    color: palette.textSecondary,
    fontSize: 14,
  },

  listNoBullets: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },

  datasetListItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 16px",
    borderBottom: `1px solid ${palette.borderMuted}`,
  },

  datasetName: {
    fontWeight: 600,
    color: palette.textPrimary,
  },

  datasetMeta: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 4,
  },

  datasetMetaSecondary: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 2,
  },

  subtleBodyText: {
    margin: "10px 0 0",
    fontSize: 13,
    color: palette.textBody,
  },
};
