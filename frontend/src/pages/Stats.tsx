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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [postsPerDay, setPostsPerDay] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [wordFrequencyData, setWordFrequencyData] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get("http://localhost:5000/stats/events_per_day"),
      axios.get("http://localhost:5000/stats/heatmap"),
      axios.get("http://localhost:5000/stats/word_frequencies"),
    ])
      .then(([eventsRes, heatmapRes, wordsRes]) => {
        setPostsPerDay(
          eventsRes.data.filter(
            (d: any) => new Date(d.date) >= new Date("2026-01-10")
          )
        );
        setHeatmapData(heatmapRes.data);
        setWordFrequencyData(
          wordsRes.data.map((d: BackendWord) => ({
            text: d.word,
            value: d.count,
          }))
        );
      })
      .catch(() => setError("Failed to load statistics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6">Loading insights…</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div>
      <h2>Posts per Day</h2>

      <ResponsiveContainer width={800} height={350}>
        <LineChart data={postsPerDay}>
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
      <ReactWordcloud 
        words={wordFrequencyData}
        options={{
                rotations: 2,
                rotationAngles: [0, 90],
                fontSizes: [14, 60],
                enableTooltip: true,
              }}
      />

      <h2>Heatmap</h2>
      <ActivityHeatmap data={heatmapData} />

    </div>
  );
}

export default StatPage;
