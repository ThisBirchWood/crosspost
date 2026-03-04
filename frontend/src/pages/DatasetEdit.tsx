import StatsStyling from "../styles/stats_styling";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const styles = StatsStyling;

type DatasetInfoResponse = {
  id: number;
  name: string;
  created_at: string;
};

const DatasetEditPage = () => {
  const navigate = useNavigate();
  const { datasetId } = useParams<{ datasetId: string }>();
  const parsedDatasetId = useMemo(() => Number(datasetId), [datasetId]);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [datasetName, setDatasetName] = useState("");

  const token = localStorage.getItem("access_token");
  if (!token) {
    setHasError(true);
    setStatusMessage("You must be signed in to save changes.");
  }

  useEffect(() => {
    if (!Number.isInteger(parsedDatasetId) || parsedDatasetId <= 0) {
      setHasError(true);
      setStatusMessage("Invalid dataset id.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setHasError(true);
      setStatusMessage("You must be signed in to edit datasets.");
      setLoading(false);
      return;
    }

    axios
      .get<DatasetInfoResponse>(`${API_BASE_URL}/dataset/${parsedDatasetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setDatasetName(response.data.name || "");
      })
      .catch((error: unknown) => {
        setHasError(true);
        if (axios.isAxiosError(error)) {
          setStatusMessage(String(error.response?.data?.error || error.message));
        } else {
          setStatusMessage("Could not get dataset info.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [parsedDatasetId]);


  const saveDatasetName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = datasetName.trim();
    if (!trimmedName) {
      setHasError(true);
      setStatusMessage("Please enter a valid dataset name.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setHasError(true);
      setStatusMessage("You must be signed in to save changes.");
      return;
    }

    try {
      setIsSaving(true);
      setHasError(false);
      setStatusMessage("");

      await axios.patch(
        `${API_BASE_URL}/dataset/${parsedDatasetId}`,
        { name: trimmedName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate("/datasets", { replace: true });
    } catch (error: unknown) {
      setHasError(true);
      if (axios.isAxiosError(error)) {
        setStatusMessage(String(error.response?.data?.error || error.message || "Save failed."));
      } else {
        setStatusMessage("Save failed due to an unexpected error.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDataset = async () => {
    try{
      await axios.delete(
        `${API_BASE_URL}/dataset/${parsedDatasetId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate("/datasets", { replace: true });
    } catch (error: unknown) {
      setHasError(true);
      if (axios.isAxiosError(error)) {
        setStatusMessage(String(error.response?.data?.error || error.message || "Save failed."));
      } else {
        setStatusMessage("Save failed due to an unexpected error.");
      }
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.containerNarrow}>
        <div style={{ ...styles.card, ...styles.headerBar }}>
          <div>
            <h1 style={styles.sectionHeaderTitle}>Edit Dataset</h1>
            <p style={styles.sectionHeaderSubtitle}>Update the dataset name shown in your datasets list.</p>
          </div>
        </div>

        <form
          onSubmit={saveDatasetName}
          style={{ ...styles.card, marginTop: 14, display: "grid", gap: 12 }}
        >
          <label
            htmlFor="dataset-name"
            style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}
          >
            Dataset name
          </label>

          <input
            id="dataset-name"
            style={{ ...styles.input, ...styles.inputFullWidth }}
            type="text"
            placeholder="Example: Cork Discussions - Jan 2026"
            value={datasetName}
            onChange={(event) => setDatasetName(event.target.value)}
            disabled={loading || isSaving}
          />

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              style={styles.buttonDanger}
              onClick={deleteDataset}
              disabled={isSaving}
              >
                Delete Dataset
            </button>

            <button
              type="button"
              style={styles.buttonSecondary}
              onClick={() => navigate("/datasets")}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ ...styles.buttonPrimary, opacity: loading || isSaving ? 0.75 : 1 }}
              disabled={loading || isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>

            {loading
            ? "Loading dataset details..."
            : statusMessage}
          </div>
        </form>
      </div>
    </div>
  );
};

export default DatasetEditPage;
