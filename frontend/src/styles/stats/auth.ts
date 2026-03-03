import { palette } from "./palette";
import type { StyleMap } from "./types";

export const authStyles: StyleMap = {
  containerAuth: {
    maxWidth: 560,
    margin: "0 auto",
    padding: "48px 24px",
  },

  headingXl: {
    margin: 0,
    color: palette.textPrimary,
    fontSize: 28,
    fontWeight: 600,
    lineHeight: 1.1,
  },

  headingBlock: {
    marginBottom: 22,
    textAlign: "center",
  },

  mutedText: {
    margin: "8px 0 0",
    color: palette.textSecondary,
    fontSize: 14,
  },

  authCard: {
    padding: 28,
  },

  authForm: {
    display: "grid",
    gap: 12,
    maxWidth: 380,
    margin: "0 auto",
  },

  inputFullWidth: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  authControl: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  authErrorText: {
    color: palette.dangerText,
    margin: "12px auto 0",
    fontSize: 14,
    maxWidth: 380,
    textAlign: "center",
  },

  authInfoText: {
    color: palette.successText,
    margin: "12px auto 0",
    fontSize: 14,
    maxWidth: 380,
    textAlign: "center",
  },

  authSwitchRow: {
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  authSwitchLabel: {
    color: palette.textSecondary,
    fontSize: 14,
  },

  authSwitchButton: {
    border: "none",
    background: "transparent",
    color: palette.brandGreenBorder,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  },
};
