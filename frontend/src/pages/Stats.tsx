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

function PostsPerDay() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("http://localhost:5000/stats/posts_per_day")
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || "Failed to load data");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading posts per day…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <h2>Posts per Day</h2>

      <ResponsiveContainer width="100%" height={350}>
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
    </div>
  );
}

export default PostsPerDay;
