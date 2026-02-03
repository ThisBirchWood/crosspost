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

type BackendWord = {
    word: string;
    count: number;
}

type TopUser = {
  author: string;
  source: string;
  count: number;
};

const styles = StatsStyling;

const StatPage = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [postsPerDay, setPostsPerDay] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [topUserData, setTopUserData] = useState<TopUser[]>([]);
  const [wordFrequencyData, setWordFrequencyData] = useState([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const beforeDateRef = useRef<HTMLInputElement>(null);
  const afterDateRef = useRef<HTMLInputElement>(null);

  const getStats = () => {
    setError("");
    setLoading(true);

    Promise.all([
      axios.get("http://localhost:5000/stats/time"),
      axios.get("http://localhost:5000/stats/user"),
      axios.get("http://localhost:5000/stats/content"),
    ]) 
      .then(([timeRes, userRes, wordsRes]) => {
        const eventsPerDay = Array.isArray(timeRes.data?.events_per_day)
          ? timeRes.data.events_per_day.filter((d: any) => new Date(d.date) >= new Date("2026-01-10"))
          : [];

        const topUsers = Array.isArray(userRes.data?.top_users)
          ? userRes.data.top_users.slice(0, 100)
          : [];

        const weekdayHourHeatmap = Array.isArray(timeRes.data?.weekday_hour_heatmap)
          ? timeRes.data.weekday_hour_heatmap
          : [];

        const wordFrequencies = Array.isArray(wordsRes.data?.word_frequencies)
          ? wordsRes.data.word_frequencies
          : [];

        setPostsPerDay(
          eventsPerDay
        );

        setTopUserData(topUsers);
        setHeatmapData(weekdayHourHeatmap);
        setWordFrequencyData(
          wordFrequencies.map((d: BackendWord) => ({
            text: d.word,
            value: d.count,
          }))
        );
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
    <div style={{ ...styles.container, ...styles.grid }}>
      {/* events per day */}
      <div style={{ ...styles.card, gridColumn: "span 5" }}>
        <h2 style={styles.sectionTitle}>Events per Day</h2>
        <p style={styles.sectionSubtitle}>Trend of activity over time</p>

        <div style={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={postsPerDay}>
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
            words={wordFrequencyData}
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
      {topUserData?.length > 0 && (
        <div
          style={{
            ...styles.card,
            ...styles.scrollArea,
            gridColumn: "span 3",
          }}
        >
          <h2 style={styles.sectionTitle}>Top Users</h2>
          <p style={styles.sectionSubtitle}>Most active authors</p>

          <div style={styles.topUsersList}>
            {topUserData.map((item) => (
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
      )}

      {/* Heatmap */}
      <div style={{ ...styles.card, gridColumn: "span 12" }}>
        <h2 style={styles.sectionTitle}>Heatmap</h2>
        <p style={styles.sectionSubtitle}>Activity density across time</p>

        <div style={styles.heatmapWrapper}>
          <ActivityHeatmap data={heatmapData} />
        </div>
      </div>
    </div>
  </div>
);
}

export default StatPage;