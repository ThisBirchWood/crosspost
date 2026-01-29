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

import ActivityHeatmap from "../stats/ActivityHeatmap";
import { ReactWordcloud } from '@cp949/react-wordcloud';

type BackendWord = {
    word: string;
    count: number;
}

const StatPage = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [heatmapData, setHeatmapData] = useState([]);
  const [wordFrequencyData, setWordFrequencyData] = useState([]);

  useEffect(() => {
    // Posts per Day
    axios
        .get("http://localhost:5000/stats/events_per_day")
        .then(res => {
          setData(res.data.filter((item: any) => new Date(item.date) >= new Date("2026-01-10")));
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

      // Word Frequencies
    axios
        .get("http://localhost:5000/stats/word_frequencies")
        .then(res => {
            const mapped = res.data.map((d: BackendWord) => (
                {text: d.word, value: d.count}
            ));
            setWordFrequencyData(mapped);
        })
        .catch(err => {
            setError(err);
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
      <ReactWordcloud words={wordFrequencyData}/>

      <h2>Heatmap</h2>
      <ActivityHeatmap data={heatmapData} />

    </div>
  );
}

export default StatPage;
