import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import StatsStyling from "../styles/stats_styling";

const styles = StatsStyling;
const API_BASE_URL = "http://localhost:5000";

const LoginPage = () => {
  const navigate = useNavigate();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return;
    }

    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    axios
      .get(`${API_BASE_URL}/profile`)
      .then(() => {
        navigate("/upload", { replace: true });
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        delete axios.defaults.headers.common.Authorization;
      });
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (isRegisterMode) {
        await axios.post(`${API_BASE_URL}/register`, { username, email, password });
        setInfo("Account created. You can now sign in.");
        setIsRegisterMode(false);
      } else {
        const response = await axios.post<{ access_token: string }>(
          `${API_BASE_URL}/login`,
          { username, password }
        );

        const token = response.data.access_token;
        localStorage.setItem("access_token", token);
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        navigate("/upload");
      }
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError)) {
        setError(
          String(requestError.response?.data?.error || requestError.message || "Request failed")
        );
      } else {
        setError("Unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, maxWidth: 520, marginTop: 64 }}>
        <div
          style={{
            ...styles.card,
            padding: 24,
            background:
              "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,255,1) 100%)",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0, color: "#111827", fontSize: 28 }}>
              {isRegisterMode ? "Create your account" : "Welcome back"}
            </h1>
            <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14 }}>
              {isRegisterMode
                ? "Register to start uploading and exploring your dataset insights."
                : "Sign in to continue to your analytics workspace."}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <input
              type="text"
              placeholder="Username"
              style={{ ...styles.input, width: "100%", maxWidth: "100%" }}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />

            {isRegisterMode && (
              <input
                type="email"
                placeholder="Email"
                style={{ ...styles.input, width: "100%", maxWidth: "100%" }}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            )}

            <input
              type="password"
              placeholder="Password"
              style={{ ...styles.input, width: "100%", maxWidth: "100%" }}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button type="submit" style={styles.buttonPrimary} disabled={loading}>
              {loading
                ? "Please wait..."
                : isRegisterMode
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          {error && (
            <p style={{ color: "#b91c1c", marginTop: 12, marginBottom: 0, fontSize: 14 }}>
              {error}
            </p>
          )}

          {info && (
            <p style={{ color: "#166534", marginTop: 12, marginBottom: 0, fontSize: 14 }}>
              {info}
            </p>
          )}

          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#6b7280", fontSize: 14 }}>
              {isRegisterMode ? "Already have an account?" : "New here?"}
            </span>
            <button
              type="button"
              style={styles.buttonSecondary}
              onClick={() => {
                setError("");
                setInfo("");
                setIsRegisterMode((value) => !value);
              }}
            >
              {isRegisterMode ? "Switch to sign in" : "Create account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
