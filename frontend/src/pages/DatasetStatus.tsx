import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import StatsStyling from "../styles/stats_styling";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL

type DatasetStatusResponse = {
  status?: "fetching" | "processing" | "complete" | "error";
  status_message?: string | null;
  completed_at?: string | null;
};

const styles = StatsStyling;

const DatasetStatusPage = () => {
  const navigate = useNavigate();
  const { datasetId } = useParams<{ datasetId: string }>();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<DatasetStatusResponse["status"]>("processing");
  const [statusMessage, setStatusMessage] = useState("");
  const parsedDatasetId = useMemo(() => Number(datasetId), [datasetId]);

  useEffect(() => {
    if (!Number.isInteger(parsedDatasetId) || parsedDatasetId <= 0) {
      setLoading(false);
      setStatus("error");
      setStatusMessage("Invalid dataset id.");
      return;
    }

    let pollTimer: number | undefined;

    const pollStatus = async () => {
      try {
        const response = await axios.get<DatasetStatusResponse>(
          `${API_BASE_URL}/dataset/${parsedDatasetId}/status`
        );

        const nextStatus = response.data.status ?? "processing";
        setStatus(nextStatus);
        setStatusMessage(String(response.data.status_message ?? ""));
        setLoading(false);

        if (nextStatus === "complete") {
          window.setTimeout(() => {
            navigate(`/dataset/${parsedDatasetId}/stats`, { replace: true });
          }, 800);
        }
      } catch (error: unknown) {
        setLoading(false);
        setStatus("error");
        if (axios.isAxiosError(error)) {
          const message = String(error.response?.data?.error || error.message || "Request failed");
          setStatusMessage(message);
        } else {
          setStatusMessage("Unable to fetch dataset status.");
        }
      }
    };

    void pollStatus();
    pollTimer = window.setInterval(() => {
      if (status !== "complete" && status !== "error") {
        void pollStatus();
      }
    }, 2000);

    return () => {
      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
    };
  }, [navigate, parsedDatasetId, status]);

  const isProcessing = loading || status === "fetching" || status === "processing";
  const isError = status === "error";

  return (
    <div style={styles.page}>
      <div style={styles.containerNarrow}>
        <div style={{ ...styles.card, marginTop: 28 }}>
          <h1 style={styles.sectionHeaderTitle}>
            {isProcessing ? "Processing dataset..." : isError ? "Dataset processing failed" : "Dataset ready"}
          </h1>

          <p style={{ ...styles.sectionSubtitle, marginTop: 10 }}>
            {isProcessing &&
              "Your dataset is being analyzed. This page will redirect to stats automatically once complete."}
            {isError && "There was an issue while processing your dataset. Please review the error details."}
            {status === "complete" && "Processing complete. Redirecting to your stats now..."}
          </p>

          <div
            style={{
              ...styles.card,
              ...styles.statusMessageCard,
              borderColor: isError ? "rgba(185, 28, 28, 0.28)" : "rgba(0,0,0,0.06)",
              background: isError ? "#fff5f5" : "#ffffff",
              color: isError ? "#991b1b" : "#374151",
            }}
          >
            {statusMessage || (isProcessing ? "Waiting for updates from the worker queue..." : "No details provided.")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasetStatusPage;
