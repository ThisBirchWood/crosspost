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
    <div style={styles.appShell}>
      <div style={{ ...styles.container, ...styles.appHeaderWrap }}>
        <div style={{ ...styles.card, ...styles.headerBar }}>
          <div style={styles.appHeaderBrandRow}>
            <span style={styles.appTitle}>
              CrossPost Analysis Engine
            </span>
            <span
              style={{
                ...styles.authStatusBadge,
                ...(isSignedIn ? styles.authStatusSignedIn : styles.authStatusSignedOut),
              }}
            >
              {isSignedIn ? `Signed in: ${getUserLabel(currentUser)}` : "Not signed in"}
            </span>
          </div>

          <div style={styles.controlsWrapped}>
            {isSignedIn && <button
              type="button"
              style={location.pathname === "/datasets" ? styles.buttonPrimary : styles.buttonSecondary}
              onClick={() => navigate("/datasets")}
            >
              My datasets
            </button>}

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
