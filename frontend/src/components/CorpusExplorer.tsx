import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

import StatsStyling from "../styles/stats_styling";
import type { DatasetRecord } from "../utils/corpusExplorer";

const styles = StatsStyling;
const INITIAL_RECORD_COUNT = 60;
const RECORD_BATCH_SIZE = 60;
const EXCERPT_LENGTH = 320;

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

const CorpusExplorer = ({
  open,
  onClose,
  title,
  description,
  records,
  loading,
  error,
  emptyMessage,
}: CorpusExplorerProps) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_RECORD_COUNT);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setVisibleCount(INITIAL_RECORD_COUNT);
      setExpandedKeys({});
    }
  }, [open, title, records.length]);

  const visibleRecords = useMemo(
    () => records.slice(0, visibleCount),
    [records, visibleCount],
  );

  const hasMoreRecords = visibleCount < records.length;

  return (
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
            overflow: "hidden",
          }}
        >
          <div style={styles.headerBar}>
            <div style={{ minWidth: 0 }}>
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

          {loading ? <div style={styles.topUserMeta}>Preparing corpus slice...</div> : null}

          {!loading && !error && records.length ? (
            <>
              <div
                style={{
                  ...styles.topUsersList,
                  overflowY: "auto",
                  overflowX: "hidden",
                  paddingRight: 4,
                }}
              >
                {visibleRecords.map((record, index) => {
                  const recordKey = getRecordKey(record, index);
                  const titleText = getRecordTitle(record);
                  const content = cleanText(record.content);
                  const isExpanded = !!expandedKeys[recordKey];
                  const canExpand = content.length > EXCERPT_LENGTH;
                  const excerpt =
                    canExpand && !isExpanded
                      ? `${content.slice(0, EXCERPT_LENGTH - 3)}...`
                      : content || "No content available.";

                  return (
                    <div key={recordKey} style={styles.topUserItem}>
                      <div style={{ ...styles.headerBar, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          {titleText ? <div style={styles.topUserName}>{titleText}</div> : null}
                          <div
                            style={{
                              ...styles.topUserMeta,
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                            }}
                          >
                            {displayText(record.author, "Unknown author")} • {displayText(record.source, "Unknown source")} • {displayText(record.type, "record")} • {formatRecordDate(record)}
                          </div>
                        </div>
                        <div
                          style={{
                            ...styles.topUserMeta,
                            marginLeft: 12,
                            textAlign: "right",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                          }}
                        >
                          {cleanText(record.topic) ? `Topic: ${cleanText(record.topic)}` : ""}
                        </div>
                      </div>

                      <div
                        style={{
                          ...styles.topUserMeta,
                          marginTop: 8,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {excerpt}
                      </div>

                      {canExpand ? (
                        <div style={{ marginTop: 10 }}>
                          <button
                            onClick={() =>
                              setExpandedKeys((current) => ({
                                ...current,
                                [recordKey]: !current[recordKey],
                              }))
                            }
                            style={styles.buttonSecondary}
                          >
                            {isExpanded ? "Show Less" : "Show More"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {hasMoreRecords ? (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() =>
                      setVisibleCount((current) => current + RECORD_BATCH_SIZE)
                    }
                    style={styles.buttonSecondary}
                  >
                    Show More Records
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default CorpusExplorer;
