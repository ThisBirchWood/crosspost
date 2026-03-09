import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL

const UploadPage = () => {
  const [datasetName, setDatasetName] = useState("");
  const [postFile, setPostFile] = useState<File | null>(null);
  const [topicBucketFile, setTopicBucketFile] = useState<File | null>(null);
  const [returnMessage, setReturnMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const navigate = useNavigate();

  const uploadFiles = async () => {
    const normalizedDatasetName = datasetName.trim();

    if (!normalizedDatasetName) {
      setHasError(true);
      setReturnMessage("Please add a dataset name before continuing.");
      return;
    }

    if (!postFile || !topicBucketFile) {
      setHasError(true);
      setReturnMessage("Please upload both files before continuing.");
      return;
    }

    const formData = new FormData();
    formData.append("name", normalizedDatasetName);
    formData.append("posts", postFile);
    formData.append("topics", topicBucketFile);

    try {
      setIsSubmitting(true);
      setHasError(false);
      setReturnMessage("");

      const response = await axios.post(`${API_BASE_URL}/datasets/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const datasetId = Number(response.data.dataset_id);

      setReturnMessage(
        `Upload queued successfully (dataset #${datasetId}). Redirecting to processing status...`
      );

      setTimeout(() => {
        navigate(`/dataset/${datasetId}/status`);
      }, 400);
    } catch (error: unknown) {
      setHasError(true);
      if (axios.isAxiosError(error)) {
        const message = String(error.response?.data?.error || error.message || "Upload failed.");
        setReturnMessage(`Upload failed: ${message}`);
      } else {
        setReturnMessage("Upload failed due to an unexpected error.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.containerWide}>
        <div style={{ ...styles.card, ...styles.headerBar }}>
          <div>
            <h1 style={styles.sectionHeaderTitle}>Upload Dataset</h1>
            <p style={styles.sectionHeaderSubtitle}>
              Name your dataset, then upload posts and topic map files to generate analytics.
            </p>
          </div>
          <button
            type="button"
            style={{ ...styles.buttonPrimary, opacity: isSubmitting ? 0.75 : 1 }}
            onClick={uploadFiles}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Uploading..." : "Upload and Analyze"}
          </button>
        </div>

        <div
          style={{
            ...styles.grid,
            marginTop: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          <div style={{ ...styles.card, gridColumn: "auto" }}>
            <h2 style={{ ...styles.sectionTitle, color: "#24292f" }}>Dataset Name</h2>
            <p style={styles.sectionSubtitle}>Use a clear label so you can identify this upload later.</p>
            <input
              style={{ ...styles.input, ...styles.inputFullWidth }}
              type="text"
              placeholder="Example: Cork Discussions - Jan 2026"
              value={datasetName}
              onChange={(event) => setDatasetName(event.target.value)}
            />
          </div>

          <div style={{ ...styles.card, gridColumn: "auto" }}>
            <h2 style={{ ...styles.sectionTitle, color: "#24292f" }}>Posts File (.jsonl)</h2>
            <p style={styles.sectionSubtitle}>Upload the raw post records export.</p>
            <input
              style={{ ...styles.input, ...styles.inputFullWidth }}
              type="file"
              accept=".jsonl"
              onChange={(event) => setPostFile(event.target.files?.[0] ?? null)}
            />
            <p style={styles.subtleBodyText}>
              {postFile ? `Selected: ${postFile.name}` : "No file selected"}
            </p>
          </div>

          <div style={{ ...styles.card, gridColumn: "auto" }}>
            <h2 style={{ ...styles.sectionTitle, color: "#24292f" }}>Topics File (.json)</h2>
            <p style={styles.sectionSubtitle}>Upload your topic bucket mapping file.</p>
            <input
              style={{ ...styles.input, ...styles.inputFullWidth }}
              type="file"
              accept=".json"
              onChange={(event) => setTopicBucketFile(event.target.files?.[0] ?? null)}
            />
            <p style={styles.subtleBodyText}>
              {topicBucketFile ? `Selected: ${topicBucketFile.name}` : "No file selected"}
            </p>
          </div>
        </div>

        <div
          style={{
            ...styles.card,
            marginTop: 14,
            ...(hasError ? styles.alertCardError : styles.alertCardInfo),
          }}
        >
          {returnMessage || "After upload, your dataset is queued for processing and you'll land on stats."}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
