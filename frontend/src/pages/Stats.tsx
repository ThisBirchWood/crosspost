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

type BackendWord = {
    word: string;
    count: number;
}

type TopUser = {
  author: string;
  source: string;
  count: number;
};

const StatPage = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [postsPerDay, setPostsPerDay] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [topUserData, setTopUserData] = useState<TopUser[]>([]);
  const [wordFrequencyData, setWordFrequencyData] = useState([]);

  const inputRef = useRef<HTMLInputElement>(null);

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
          ? timeRes.data.events_per_day
          : [];

        const topUsers = Array.isArray(userRes.data?.top_users)
          ? userRes.data.top_users
          : [];

        const weekdayHourHeatmap = Array.isArray(timeRes.data?.weekday_hour_heatmap)
          ? timeRes.data.weekday_hour_heatmap
          : [];

        const wordFrequencies = Array.isArray(wordsRes.data?.word_frequencies)
          ? wordsRes.data.word_frequencies
          : [];

        setPostsPerDay(
          eventsPerDay.filter(
            (d: any) => new Date(d.date) >= new Date("2026-01-10")
          )
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

  const onSearch = () => {
    const query = inputRef.current?.value ?? "";
    axios.post("http://localhost:5000/filter/search", {
      query: query
    })
    .then(() => {
      getStats();
    })
    .catch(e => {
      setError(e);
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
    getStats();
  }, [])

  if (loading) return <p className="p-6">Loading insights…</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div>

        <input 
          type="text"
          id="query"
          ref={inputRef}
        />

        <button onClick={onSearch}>Search</button>
        <button onClick={resetFilters}>Reset</button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 2fr 2fr",
          gap: 12,
          margin: "0 auto",
          width: "100%",
          height: "100%"
        }}
      >

        <div>
          <h2>Events per Day</h2>

          <ResponsiveContainer width={600} height={350}>
            <LineChart data={postsPerDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                name="Events"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h2>Word Cloud</h2>
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

        {topUserData?.length > 0 && (
          <div
              style={{
              maxHeight: 450,
              width: "100%",
              overflowY: "auto",
              padding: 12
            }}
          >
            <h2>Top Users</h2>
            {topUserData.map((item) => (
              <p key={`${item.author}-${item.source}`}>
                {item.author} ({item.source}): {item.count}
              </p>
            ))}
          </div>
        )}

        </div>

      <div style={{ width: "100%", height: 320}}>
        <h2>Heatmap</h2>
        <ActivityHeatmap data={heatmapData} />
      </div>
    </div>
  );
}

export default StatPage;
