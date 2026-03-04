import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import StatsStyling from "../styles/stats_styling";
import SummaryStats from "../components/SummaryStats";
import EmotionalStats from "../components/EmotionalStats";
import UserStats from "../components/UserStats";

import { 
  type SummaryResponse, 
  type UserAnalysisResponse, 
  type TimeAnalysisResponse,
  type ContentAnalysisResponse
} from '../types/ApiTypes'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL
const styles = StatsStyling;

const StatPage = () => {
  const { datasetId: routeDatasetId } = useParams<{ datasetId: string }>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<"summary" | "emotional" | "user">("summary");

  const [userData, setUserData] = useState<UserAnalysisResponse | null>(null);
  const [timeData, setTimeData] = useState<TimeAnalysisResponse | null>(null);
  const [contentData, setContentData] = useState<ContentAnalysisResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);


  const searchInputRef = useRef<HTMLInputElement>(null);
  const beforeDateRef = useRef<HTMLInputElement>(null);
  const afterDateRef = useRef<HTMLInputElement>(null);

  const parsedDatasetId = Number(routeDatasetId ?? "");
  const datasetId = Number.isInteger(parsedDatasetId) && parsedDatasetId > 0 ? parsedDatasetId : null;

  const getFilterParams = () => {
    const params: Record<string, string> = {};
    const query = (searchInputRef.current?.value ?? "").trim();
    const start = (afterDateRef.current?.value ?? "").trim();
    const end = (beforeDateRef.current?.value ?? "").trim();

    if (query) {
      params.search_query = query;
    }

    if (start) {
      params.start_date = start;
    }

    if (end) {
      params.end_date = end;
    }

    return params;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return null;
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const getStats = (params: Record<string, string> = {}) => {
    if (!datasetId) {
      setError("Missing dataset id. Open /dataset/<id>/stats.");
      return;
    }

    const authHeaders = getAuthHeaders();
    if (!authHeaders) {
      setError("You must be signed in to load stats.");
      return;
    }

    setError("");
    setLoading(true);

    Promise.all([
      axios.get<TimeAnalysisResponse>(`${API_BASE_URL}/dataset/${datasetId}/time`, {
        params,
        headers: authHeaders,
      }),
      axios.get<UserAnalysisResponse>(`${API_BASE_URL}/dataset/${datasetId}/user`, {
        params,
        headers: authHeaders,
      }),
      axios.get<ContentAnalysisResponse>(`${API_BASE_URL}/dataset/${datasetId}/content`, {
        params,
        headers: authHeaders,
      }),
      axios.get<SummaryResponse>(`${API_BASE_URL}/dataset/${datasetId}/summary`, {
        params,
        headers: authHeaders,
      }),
    ]) 
      .then(([timeRes, userRes, contentRes, summaryRes]) => {
        setUserData(userRes.data || null);
        setTimeData(timeRes.data || null);
        setContentData(contentRes.data || null);
        setSummary(summaryRes.data || null);
      })
      .catch((e) => setError("Failed to load statistics: " + String(e)))
      .finally(() => setLoading(false));
  };

  const onSubmitFilters = () => {
    getStats(getFilterParams());
  };

  const resetFilters = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
    if (beforeDateRef.current) {
      beforeDateRef.current.value = "";
    }
    if (afterDateRef.current) {
      afterDateRef.current.value = "";
    }
    getStats();
  };

  useEffect(() => {
    setError("");
    if (!datasetId) {
      setError("Missing dataset id. Open /dataset/<id>/stats.");
      return;
    }
    getStats();
  }, [datasetId])

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={{ ...styles.loadingCard, transform: "translateY(-100px)" }}>
          <div style={styles.loadingHeader}>
            <div style={styles.loadingSpinner} />
            <div>
              <h2 style={styles.loadingTitle}>Loading analytics</h2>
              <p style={styles.loadingSubtitle}>Fetching summary, timeline, user, and content insights.</p>
            </div>
          </div>

          <div style={styles.loadingSkeleton}>
            <div style={{ ...styles.loadingSkeletonLine, ...styles.loadingSkeletonLineLong }} />
            <div style={{ ...styles.loadingSkeletonLine, ...styles.loadingSkeletonLineMed }} />
            <div style={{ ...styles.loadingSkeletonLine, ...styles.loadingSkeletonLineShort }} />
          </div>
        </div>
      </div>
    );
  }
  if (error) return <p style={{...styles.page}}>{error}</p>;

return (
  <div style={styles.page}>
    <div style={{ ...styles.container, ...styles.card, ...styles.headerBar }}>
      <div style={styles.controls}>
        <input
          type="text"
          id="query"
          ref={searchInputRef}
          placeholder="Search events..."
          style={styles.input}
        />

        <input 
          type="date"
          ref={beforeDateRef}
          placeholder="Search before date"
          style={styles.input}
        />

        <input
            type="date"
            ref={afterDateRef}
            placeholder="Search before date"
            style={styles.input}
        />

        <button onClick={onSubmitFilters} style={styles.buttonPrimary}>
          Search
        </button>

        <button onClick={resetFilters} style={styles.buttonSecondary}>
          Reset
        </button>
      </div>

          <div style={styles.dashboardMeta}>Analytics Dashboard</div>
          <div style={styles.dashboardMeta}>Dataset #{datasetId ?? "-"}</div>
        </div>

    <div style={{ ...styles.container, ...styles.tabsRow }}>
      <button
        onClick={() => setActiveView("summary")}
        style={activeView === "summary" ? styles.buttonPrimary : styles.buttonSecondary}
      >
        Summary
      </button>
      <button
        onClick={() => setActiveView("emotional")}
        style={activeView === "emotional" ? styles.buttonPrimary : styles.buttonSecondary}
      >
        Emotional
      </button>

      <button
        onClick={() => setActiveView("user")}
        style={activeView === "user" ? styles.buttonPrimary : styles.buttonSecondary}
      >
        Users
      </button>
    </div>

    {activeView === "summary" && (
      <SummaryStats
        userData={userData}
        timeData={timeData}
        contentData={contentData}
        summary={summary}
      />
    )}

    {activeView === "emotional" && contentData && (
      <EmotionalStats contentData={contentData} />
    )}

    {activeView === "emotional" && !contentData && (
      <div style={{ ...styles.container, ...styles.card, marginTop: 16 }}>
        No emotional data available.
      </div>
    )}

    {activeView === "user" && userData && (
      <UserStats data={userData} />
    )}

  </div>
);
}

export default StatPage;
