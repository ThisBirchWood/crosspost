import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import StatsStyling from "../styles/stats_styling";
import SummaryStats from "../components/SummaryStats";
import EmotionalStats from "../components/EmotionalStats";
import UserStats from "../components/UserStats";
import LinguisticStats from "../components/LinguisticStats";
import InteractionalStats from "../components/InteractionalStats";
import CulturalStats from "../components/CulturalStats";

import { 
  type SummaryResponse, 
  type UserAnalysisResponse, 
  type TimeAnalysisResponse,
  type ContentAnalysisResponse,
  type UserEndpointResponse,
  type LinguisticAnalysisResponse,
  type EmotionalAnalysisResponse,
  type InteractionAnalysisResponse,
  type CulturalAnalysisResponse
} from '../types/ApiTypes'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL
const styles = StatsStyling;

const StatPage = () => {
  const { datasetId: routeDatasetId } = useParams<{ datasetId: string }>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<"summary" | "emotional" | "user" | "linguistic" | "interactional" | "cultural">("summary");

  const [userData, setUserData] = useState<UserAnalysisResponse | null>(null);
  const [timeData, setTimeData] = useState<TimeAnalysisResponse | null>(null);
  const [contentData, setContentData] = useState<ContentAnalysisResponse | null>(null);
  const [linguisticData, setLinguisticData] = useState<LinguisticAnalysisResponse | null>(null);
  const [interactionData, setInteractionData] = useState<InteractionAnalysisResponse | null>(null);
  const [culturalData, setCulturalData] = useState<CulturalAnalysisResponse | null>(null);
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
      axios.get<TimeAnalysisResponse>(`${API_BASE_URL}/dataset/${datasetId}/temporal`, {
        params,
        headers: authHeaders,
      }),
      axios.get<UserEndpointResponse>(`${API_BASE_URL}/dataset/${datasetId}/user`, {
        params,
        headers: authHeaders,
      }),
      axios.get<LinguisticAnalysisResponse>(`${API_BASE_URL}/dataset/${datasetId}/linguistic`, {
        params,
        headers: authHeaders,
      }),
      axios.get<EmotionalAnalysisResponse>(`${API_BASE_URL}/dataset/${datasetId}/emotional`, {
        params,
        headers: authHeaders,
      }),
      axios.get<InteractionAnalysisResponse>(`${API_BASE_URL}/dataset/${datasetId}/interactional`, {
        params,
        headers: authHeaders,
      }),
      axios.get<SummaryResponse>(`${API_BASE_URL}/dataset/${datasetId}/summary`, {
        params,
        headers: authHeaders,
      }),
      axios.get<CulturalAnalysisResponse>(`${API_BASE_URL}/dataset/${datasetId}/cultural`, {
        params,
        headers: authHeaders,
      }),
    ]) 
      .then(([timeRes, userRes, linguisticRes, emotionalRes, interactionRes, summaryRes, culturalRes]) => {
        const combinedUserData: UserAnalysisResponse = {
          ...userRes.data,
          interaction_graph: interactionRes.data?.interaction_graph ?? {},
        };

        const combinedContentData: ContentAnalysisResponse = {
          ...linguisticRes.data,
          ...emotionalRes.data,
        };

        setUserData(combinedUserData);
        setTimeData(timeRes.data || null);
        setContentData(combinedContentData);
        setLinguisticData(linguisticRes.data || null);
        setInteractionData(interactionRes.data || null);
        setCulturalData(culturalRes.data || null);
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
      <button
        onClick={() => setActiveView("linguistic")}
        style={activeView === "linguistic" ? styles.buttonPrimary : styles.buttonSecondary}
      >
        Linguistic
      </button>
      <button
        onClick={() => setActiveView("interactional")}
        style={activeView === "interactional" ? styles.buttonPrimary : styles.buttonSecondary}
      >
        Interactional
      </button>
      <button
        onClick={() => setActiveView("cultural")}
        style={activeView === "cultural" ? styles.buttonPrimary : styles.buttonSecondary}
      >
        Cultural
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

    {activeView === "linguistic" && linguisticData && (
      <LinguisticStats data={linguisticData} />
    )}

    {activeView === "linguistic" && !linguisticData && (
      <div style={{ ...styles.container, ...styles.card, marginTop: 16 }}>
        No linguistic data available.
      </div>
    )}

    {activeView === "interactional" && interactionData && (
      <InteractionalStats data={interactionData} />
    )}

    {activeView === "interactional" && !interactionData && (
      <div style={{ ...styles.container, ...styles.card, marginTop: 16 }}>
        No interactional data available.
      </div>
    )}

    {activeView === "cultural" && culturalData && (
      <CulturalStats data={culturalData} />
    )}

    {activeView === "cultural" && !culturalData && (
      <div style={{ ...styles.container, ...styles.card, marginTop: 16 }}>
        No cultural data available.
      </div>
    )}

  </div>
);
}

export default StatPage;
