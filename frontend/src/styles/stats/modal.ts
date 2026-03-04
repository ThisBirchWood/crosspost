import { palette } from "./palette";
import type { StyleMap } from "./types";

export const modalStyles: StyleMap = {
  modalRoot: {
    position: "relative",
    zIndex: 50,
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: palette.modalBackdrop,
  },

  modalContainer: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },

  modalPanel: {
    width: "min(520px, 95vw)",
  },
};
