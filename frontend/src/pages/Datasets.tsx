import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

type DatasetItem = {
  id: number;
  name?: string;
  status?: "processing" | "complete" | "error" | string;
  status_message?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
};

const DatasetsPage = () => {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      setError("You must be signed in to view datasets.");
      return;
    }

    axios
      .get<DatasetItem[]>(`${API_BASE_URL}/user/datasets`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const sorted = [...(response.data || [])].sort((a, b) => b.id - a.id);
        setDatasets(sorted);
      })
      .catch((requestError: unknown) => {
        if (axios.isAxiosError(requestError)) {
          setError(String(requestError.response?.data?.error || requestError.message));
        } else {
          setError("Failed to load datasets.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p style={{ ...styles.page, minHeight: "100vh" }}>Loading datasets...</p>;
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, maxWidth: 1100 }}>
        <div style={{ ...styles.card, ...styles.headerBar }}>
          <div>
            <h1 style={{ margin: 0, color: "#111827", fontSize: 28 }}>My Datasets</h1>
            <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14 }}>
              View and reopen datasets you previously uploaded.
            </p>
          </div>
          <button type="button" style={styles.buttonPrimary} onClick={() => navigate("/upload")}>
            Upload New Dataset
          </button>
        </div>

        {error && (
          <div
            style={{
              ...styles.card,
              marginTop: 14,
              borderColor: "rgba(185, 28, 28, 0.28)",
              background: "#fff5f5",
              color: "#991b1b",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {!error && datasets.length === 0 && (
          <div style={{ ...styles.card, marginTop: 14, color: "#374151" }}>
            No datasets yet. Upload one to get started.
          </div>
        )}

        {!error && datasets.length > 0 && (
          <div style={{ ...styles.card, marginTop: 14, padding: 0, overflow: "hidden" }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {datasets.map((dataset) => {
                const isComplete = dataset.status === "complete";
                const targetPath = isComplete
                  ? `/dataset/${dataset.id}/stats`
                  : `/dataset/${dataset.id}/status`;

                return (
                  <li
                    key={dataset.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "14px 16px",
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#111827" }}>
                        {dataset.name || `Dataset #${dataset.id}`}
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                        ID #{dataset.id} • Status: {dataset.status || "unknown"}
                      </div>
                      {dataset.status_message && (
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                          {dataset.status_message}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      style={isComplete ? styles.buttonPrimary : styles.buttonSecondary}
                      onClick={() => navigate(targetPath)}
                    >
                      {isComplete ? "Open stats" : "View status"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatasetsPage;
