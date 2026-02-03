import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

import ActivityHeatmap from "../stats/ActivityHeatmap";
import { ReactWordcloud } from '@cp949/react-wordcloud';
import StatsStyling from "../styles/stats_styling";
import Card from "../components/Card";

import { 
  type TopUser, 
  type SummaryResponse, 
  type FrequencyWord, 
  type UserAnalysisResponse, 
  type TimeAnalysisResponse,
  type ContentAnalysisResponse,
  type FilterResponse
} from '../types/ApiTypes'

const styles = StatsStyling;

function formatDateRange(startUnix: number, endUnix: number) {
  const start = new Date(startUnix * 1000);
  const end = new Date(endUnix * 1000);

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

  return `${fmt(start)} → ${fmt(end)}`;
}

function convertFrequencyData(data: FrequencyWord[]) {
    return data.map((d: FrequencyWord) => ({
        text: d.word,
        value: d.count,
      }))
}

const StatPage = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    const startDate = beforeDateRef.current?.value;
    const endDate = afterDateRef.current?.value;

    Promise.all([
      axios.post("http://localhost:5000/filter/search", {
        query: query
      }),
      //axios.post("http://localhost:5000/filter/time", {
        //start: startDate,
        //end: endDate
      //})
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

    {/* main grid*/}
    <div style={{ ...styles.container, ...styles.grid}}>
        <Card
          label="Total Events"
          value={summary?.total_events ?? "—"}
          sublabel="Posts + comments"
          style={{
            gridColumn: "span 4"
          }}
        />
        <Card
          label="Unique Users"
          value={summary?.unique_users ?? "—"}
          sublabel="Distinct authors"
          style={{
            gridColumn: "span 4"
          }}
        />
        <Card
          label="Posts / Comments"
          value={
            summary
              ? `${summary.total_posts} / ${summary.total_comments}`
              : "—"
          }
          sublabel={`Comments per post: ${summary?.comments_per_post ?? "—"}`}
          style={{
            gridColumn: "span 4"
          }}
        />

        <Card
          label="Time Range"
          value={
            summary?.time_range
              ? formatDateRange(summary.time_range.start, summary.time_range.end)
              : "—"
          }
          sublabel="Based on dataset timestamps"
          style={{
            gridColumn: "span 4"
          }}
        />

        <Card
          label="Lurker Ratio"
          value={
            typeof summary?.lurker_ratio === "number"
              ? `${Math.round(summary.lurker_ratio * 100)}%`
              : "—"
          }
          sublabel="Users with only 1 event"
          style={{
            gridColumn: "span 4"
          }}
        />

        <Card
          label="Sources"
          value={summary?.sources?.length ?? "—"}
          sublabel={
            summary?.sources?.length
              ? summary.sources.slice(0, 3).join(", ") +
                (summary.sources.length > 3 ? "…" : "")
              : "—"
          }
          style={{
            gridColumn: "span 4"
          }}
        />

      {/* events per day */}
      <div style={{ ...styles.card, gridColumn: "span 5" }}>
        <h2 style={styles.sectionTitle}>Events per Day</h2>
        <p style={styles.sectionSubtitle}>Trend of activity over time</p>

        <div style={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeData?.events_per_day.filter((d) => new Date(d.date) >= new Date('2026-01-10'))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Events" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Word Cloud */}
      <div style={{ ...styles.card, gridColumn: "span 4" }}>
        <h2 style={styles.sectionTitle}>Word Cloud</h2>
        <p style={styles.sectionSubtitle}>Most common terms across events</p>

        <div style={styles.chartWrapper}>
          <ReactWordcloud
            words={convertFrequencyData(contentData?.word_frequencies ?? [])}
            options={{
              rotations: 2,
              rotationAngles: [0, 90],
              fontSizes: [14, 60],
              enableTooltip: true,
            }}
          />
        </div>
      </div>

      {/* Top Users */}
      <div style={{...styles.card, ...styles.scrollArea, gridColumn: "span 3",
      }}
      >
        <h2 style={styles.sectionTitle}>Top Users</h2>
        <p style={styles.sectionSubtitle}>Most active authors</p>

        <div style={styles.topUsersList}>
          {userData?.top_users.map((item) => (
            <div
              key={`${item.author}-${item.source}`}
              style={styles.topUserItem}
            >
              <div style={styles.topUserName}>{item.author}</div>
              <div style={styles.topUserMeta}>
                {item.source} • {item.count} events
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div style={{ ...styles.card, gridColumn: "span 12" }}>
        <h2 style={styles.sectionTitle}>Heatmap</h2>
        <p style={styles.sectionSubtitle}>Activity density across time</p>

        <div style={styles.heatmapWrapper}>
          <ActivityHeatmap data={timeData?.weekday_hour_heatmap ?? []} />
        </div>
      </div>
    </div>
  </div>
);
}

export default StatPage;