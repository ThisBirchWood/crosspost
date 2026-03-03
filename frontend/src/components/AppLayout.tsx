import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import StatsStyling from "../styles/stats_styling";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL

type ProfileResponse = {
  user?: Record<string, unknown>;
};

const styles = StatsStyling;

const getUserLabel = (user: Record<string, unknown> | null) => {
  if (!user) {
    return "Signed in";
  }

  const username = user.username;
  if (typeof username === "string" && username.length > 0) {
    return username;
  }

  const email = user.email;
  if (typeof email === "string" && email.length > 0) {
    return email;
  }

  return "Signed in";
};

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<Record<string, unknown> | null>(null);
  const [lastDatasetId, setLastDatasetId] = useState<string | null>(
    localStorage.getItem("last_dataset_id")
  );

  const syncAuthState = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setIsSignedIn(false);
      setCurrentUser(null);
      delete axios.defaults.headers.common.Authorization;
      return;
    }

    axios.defaults.headers.common.Authorization = `Bearer ${token}`;

    try {
      const response = await axios.get<ProfileResponse>(`${API_BASE_URL}/profile`);
      setIsSignedIn(true);
      setCurrentUser(response.data.user ?? null);
    } catch {
      localStorage.removeItem("access_token");
      delete axios.defaults.headers.common.Authorization;
      setIsSignedIn(false);
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    void syncAuthState();
  }, [location.pathname, syncAuthState]);

  useEffect(() => {
    const datasetMatch = location.pathname.match(/^\/dataset\/(\d+)\/(status|stats)$/);
    if (!datasetMatch) {
      return;
    }

    const datasetId = datasetMatch[1];
    localStorage.setItem("last_dataset_id", datasetId);
    setLastDatasetId(datasetId);
  }, [location.pathname]);

  const onAuthButtonClick = () => {
    if (isSignedIn) {
      localStorage.removeItem("access_token");
      delete axios.defaults.headers.common.Authorization;
      setIsSignedIn(false);
      setCurrentUser(null);
      navigate("/login", { replace: true });
      return;
    }

    navigate("/login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f7fb",
        fontFamily: styles.page.fontFamily,
        color: "#111827",
      }}
    >
      <div style={{ ...styles.container, padding: "16px 24px 0" }}>
        <div style={{ ...styles.card, ...styles.headerBar }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ margin: 0, color: "#111827", fontSize: 18, fontWeight: 700 }}>
              Ethnograph View
            </span>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: styles.page.fontFamily,
                background: isSignedIn ? "#dcfce7" : "#fee2e2",
                color: isSignedIn ? "#166534" : "#991b1b",
              }}
            >
              {isSignedIn ? `Signed in: ${getUserLabel(currentUser)}` : "Not signed in"}
            </span>
          </div>

          <div style={{ ...styles.controls, flexWrap: "wrap" }}>
            <button
              type="button"
              style={location.pathname === "/upload" ? styles.buttonPrimary : styles.buttonSecondary}
              onClick={() => navigate("/upload")}
            >
              Upload
            </button>

            <button
              type="button"
              style={location.pathname === "/datasets" ? styles.buttonPrimary : styles.buttonSecondary}
              onClick={() => navigate("/datasets")}
            >
              My datasets
            </button>

            <button
              type="button"
              style={location.pathname.endsWith("/stats") ? styles.buttonPrimary : styles.buttonSecondary}
              onClick={() => lastDatasetId && navigate(`/dataset/${lastDatasetId}/stats`)}
              disabled={!lastDatasetId}
            >
              {lastDatasetId ? "Last stats" : "Last stats (none)"}
            </button>

            <button
              type="button"
              style={isSignedIn ? styles.buttonSecondary : styles.buttonPrimary}
              onClick={onAuthButtonClick}
            >
              {isSignedIn ? "Sign out" : "Sign in"}
            </button>
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export default AppLayout;
