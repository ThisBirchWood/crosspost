import { useEffect, useState, useRef } from "react";
import axios from "axios";
import StatsStyling from "../styles/stats_styling";
import SummaryStats from "../components/SummaryStats";
import EmotionalStats from "../components/EmotionalStats";
import InteractionStats from "../components/InteractionStats";

import { 
  type SummaryResponse, 
  type UserAnalysisResponse, 
  type TimeAnalysisResponse,
  type ContentAnalysisResponse
} from '../types/ApiTypes'

const styles = StatsStyling;

const StatPage = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<"summary" | "emotional" | "interaction">("summary");

  const [userData, setUserData] = useState<UserAnalysisResponse | null>(null);
  const [timeData, setTimeData] = useState<TimeAnalysisResponse | null>(null);
  const [contentData, setContentData] = useState<ContentAnalysisResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);


  const searchInputRef = useRef<HTMLInputElement>(null);
  const beforeDateRef = useRef<HTMLInputElement>(null);
  const afterDateRef = useRef<HTMLInputElement>(null);

  const getStats = () => {
    setError("");
    setLoading(true);

    Promise.all([
      axios.get<TimeAnalysisResponse>("http://localhost:5000/stats/time"),
      axios.get<UserAnalysisResponse>("http://localhost:5000/stats/user"),
      axios.get<ContentAnalysisResponse>("http://localhost:5000/stats/content"),
      axios.get<SummaryResponse>(`http://localhost:5000/stats/summary`),
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
    const query = searchInputRef.current?.value ?? "";

    Promise.all([
      axios.post("http://localhost:5000/filter/search", {
        query: query
      }),
    ]) 
    .then(() => {
      getStats();
    })
    .catch(e => {
      setError("Failed to load filters: " + e.response);
    })
  };

  const resetFilters = () => {
    axios.get("http://localhost:5000/filter/reset")
    .then(() => {
      getStats();
    })
    .catch(e => {
      setError(e);
    })
  };

  useEffect(() => {
    setError("");
    getStats();
  }, [])

  if (loading) return <p style={{...styles.page, minWidth: "100vh", minHeight: "100vh"}}>Loading insights…</p>;
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

      <div style={{ fontSize: 13, color: "#6b7280" }}>Analytics Dashboard</div>
    </div>

    <div style={{ ...styles.container, display: "flex", gap: 8, marginTop: 12 }}>
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
        onClick={() => setActiveView("interaction")}
        style={activeView === "interaction" ? styles.buttonPrimary : styles.buttonSecondary}
      >
        Interaction
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

    {activeView === "interaction" && userData && (
      <InteractionStats data={userData} />
    )}

  </div>
);
}

export default StatPage;
