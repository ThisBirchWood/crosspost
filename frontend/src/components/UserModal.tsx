import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import type { User } from "../types/ApiTypes";
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;

type Props = {
  open: boolean;
  onClose: () => void;
  userData: User | null;
  username: string;
};

export default function UserModal({ open, onClose, userData, username }: Props) {
  return (
    <Dialog open={open} onClose={onClose} style={{ position: "relative", zIndex: 50 }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <DialogPanel style={{ ...styles.card, width: "min(520px, 95vw)" }}>
          <div style={styles.headerBar}>
            <div>
              <DialogTitle style={styles.sectionTitle}>{username}</DialogTitle>
              <p style={styles.sectionSubtitle}>User activity breakdown</p>
            </div>

            <button onClick={onClose} style={styles.buttonSecondary}>
              Close
            </button>
          </div>

          {!userData ? (
            <p style={styles.sectionSubtitle}>No data for this user.</p>
          ) : (
            <div style={styles.topUsersList}>
              <div style={{...styles.topUserName, fontSize: 20}}>{userData.author}</div>
              <div style={styles.topUserItem}>
                <div style={styles.topUserName}>Posts</div>
                <div style={styles.topUserMeta}>{userData.post}</div>
              </div>

              <div style={styles.topUserItem}>
                <div style={styles.topUserName}>Comments</div>
                <div style={styles.topUserMeta}>{userData.comment}</div>
              </div>

              <div style={styles.topUserItem}>
                <div style={styles.topUserName}>Comment/Post Ratio</div>
                <div style={styles.topUserMeta}>
                  {userData.comment_post_ratio.toFixed(2)}
                </div>
              </div>

              <div style={styles.topUserItem}>
                <div style={styles.topUserName}>Comment Share</div>
                <div style={styles.topUserMeta}>
                  {(userData.comment_share * 100).toFixed(1)}%
                </div>
              </div>

              {userData.vocab ? (
                <div style={styles.topUserItem}>
                  <div style={styles.topUserName}>Vocab Richness</div>
                  <div style={styles.topUserMeta}>
                    {userData.vocab.vocab_richness} (avg {userData.vocab.avg_words_per_event} words/event)
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
