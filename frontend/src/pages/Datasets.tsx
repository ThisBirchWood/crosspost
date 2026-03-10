import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

type DatasetItem = {
  id: number;
  name?: string;
  status?: "processing" | "complete" | "error" | "fetching" | string;
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
      <div style={styles.containerWide}>
        <div style={{ ...styles.card, ...styles.headerBar }}>
          <div>
            <h1 style={styles.sectionHeaderTitle}>My Datasets</h1>
            <p style={styles.sectionHeaderSubtitle}>
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
            <ul style={styles.listNoBullets}>
              {datasets.map((dataset) => {
                const isComplete = dataset.status === "complete" || dataset.status === "error";
                const editPath = `/dataset/${dataset.id}/edit`;
                const targetPath = isComplete
                  ? `/dataset/${dataset.id}/stats`
                  : `/dataset/${dataset.id}/status`;

                return (
                  <li
                    key={dataset.id}
                    style={styles.datasetListItem}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.datasetName}>
                        {dataset.name || `Dataset #${dataset.id}`}
                      </div>
                      <div style={styles.datasetMeta}>
                        ID #{dataset.id} • Status: {dataset.status || "unknown"}
                      </div>
                      {dataset.status_message && (
                        <div style={styles.datasetMetaSecondary}>
                          {dataset.status_message}
                        </div>
                      )}
                    </div>

                    <div>
                      { isComplete &&
                        <button
                          type="button"
                          style={{...styles.buttonSecondary, "margin": "5px"}}
                          onClick={() => navigate(editPath)}
                        >
                          Edit Dataset
                        </button>
                      }

                      <button
                        type="button"
                        style={isComplete ? styles.buttonPrimary : styles.buttonSecondary}
                        onClick={() => navigate(targetPath)}
                      >
                        {isComplete ? "Open stats" : "View status"}
                      </button>
                    </div>
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
