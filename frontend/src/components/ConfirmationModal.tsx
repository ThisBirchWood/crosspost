import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import StatsStyling from "../styles/stats_styling";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const styles = StatsStyling;

export default function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onClose={onCancel} style={styles.modalRoot}>
      <div style={styles.modalBackdrop} />

      <div style={styles.modalContainer}>
        <DialogPanel style={{ ...styles.card, ...styles.modalPanel }}>
          <DialogTitle style={styles.sectionTitle}>{title}</DialogTitle>
          <p style={styles.sectionSubtitle}>{message}</p>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onCancel} style={styles.buttonSecondary} disabled={loading}>
              {cancelLabel}
            </button>
            <button type="button" onClick={onConfirm} style={styles.buttonDanger} disabled={loading}>
              {loading ? "Deleting..." : confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
