import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

import StatsStyling from "../styles/stats_styling";
import type { DatasetRecord } from "../utils/corpusExplorer";

const styles = StatsStyling;

const cleanText = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === "nan" || lowered === "null" || lowered === "undefined") {
    return "";
  }

  return trimmed;
};

const displayText = (value: unknown, fallback: string) => {
  const cleaned = cleanText(value);
  return cleaned || fallback;
};

type CorpusExplorerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  records: DatasetRecord[];
  loading: boolean;
  error: string;
  emptyMessage: string;
};

const formatRecordDate = (record: DatasetRecord) => {
  if (typeof record.dt === "string" && record.dt) {
    const date = new Date(record.dt);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  }

  if (typeof record.date === "string" && record.date) {
    return record.date;
  }

  if (typeof record.timestamp === "number") {
    return new Date(record.timestamp * 1000).toLocaleString();
  }

  return "Unknown time";
};

const getRecordKey = (record: DatasetRecord, index: number) =>
  String(record.id ?? record.post_id ?? `${record.author ?? "record"}-${index}`);

const getRecordTitle = (record: DatasetRecord) => {
  if (record.type === "comment") {
    return "";
  }

  const title = cleanText(record.title);
  if (title) {
    return title;
  }

  const content = cleanText(record.content);
  if (!content) {
    return "Untitled record";
  }

  return content.length > 120 ? `${content.slice(0, 117)}...` : content;
};

const getRecordExcerpt = (record: DatasetRecord) => {
  const content = cleanText(record.content);
  if (!content) {
    return "No content available.";
  }

  return content.length > 320 ? `${content.slice(0, 317)}...` : content;
};

const CorpusExplorer = ({
  open,
  onClose,
  title,
  description,
  records,
  loading,
  error,
  emptyMessage,
}: CorpusExplorerProps) => (
  <Dialog open={open} onClose={onClose} style={styles.modalRoot}>
    <div style={styles.modalBackdrop} />

    <div style={styles.modalContainer}>
      <DialogPanel
        style={{
          ...styles.card,
          ...styles.modalPanel,
          width: "min(960px, 96vw)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={styles.headerBar}>
          <div>
            <DialogTitle style={styles.sectionTitle}>{title}</DialogTitle>
            <p style={styles.sectionSubtitle}>
              {description} {loading ? "Loading records..." : `${records.length.toLocaleString()} records.`}
            </p>
          </div>

          <button onClick={onClose} style={styles.buttonSecondary}>
            Close
          </button>
        </div>

        {error ? <p style={styles.sectionSubtitle}>{error}</p> : null}

        {!loading && !error && !records.length ? (
          <p style={styles.sectionSubtitle}>{emptyMessage}</p>
        ) : null}

        {loading ? (
          <div style={styles.topUserMeta}>Preparing corpus slice...</div>
        ) : null}

        {!loading && !error && records.length ? (
          <div
            style={{
              ...styles.topUsersList,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {records.map((record, index) => (
              <div key={getRecordKey(record, index)} style={styles.topUserItem}>
                <div style={{ ...styles.headerBar, alignItems: "flex-start" }}>
                  <div>
                    {getRecordTitle(record) ? (
                      <div style={styles.topUserName}>{getRecordTitle(record)}</div>
                    ) : null}
                    <div style={styles.topUserMeta}>
                      {displayText(record.author, "Unknown author")} • {displayText(record.source, "Unknown source")} • {displayText(record.type, "record")} • {formatRecordDate(record)}
                    </div>
                  </div>
                  <div style={styles.topUserMeta}>
                    {cleanText(record.topic) ? `Topic: ${cleanText(record.topic)}` : ""}
                  </div>
                </div>

                <div style={{ ...styles.topUserMeta, marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {getRecordExcerpt(record)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </DialogPanel>
    </div>
  </Dialog>
);

export default CorpusExplorer;
