import { useEffect, useState } from "react";
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
import WordCloud from "../stats/WordCloud";
import ActivityHeatmap from "../stats/ActivityHeatmap";


const StatPage = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    // Posts per Day
    axios
      .get("http://localhost:5000/stats/posts_per_day")
      .then(res => {
        setData(res.data.filter((item: any) => new Date(item.date) >= new Date("2025-06-01")));
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || "Failed to load data");
        setLoading(false);
      });

      // Heatmap
      axios
      .get("http://localhost:5000/stats/heatmap")
      .then(res => {
        setHeatmapData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || "Failed to load heatmap data");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading posts per day…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <h2>Posts per Day</h2>

      <ResponsiveContainer width={800} height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="posts_count"
            name="Posts"
          />
        </LineChart>
      </ResponsiveContainer>

      <h2>Word Cloud</h2>
      <WordCloud />

      <h2>Heatmap</h2>
      <ActivityHeatmap data={heatmapData} />

    </div>
  );
}

export default StatPage;
