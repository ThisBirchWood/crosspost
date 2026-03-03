import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/Login";
import UploadPage from "./pages/Upload";
import StatPage from "./pages/Stats";

function App() {
  const location = useLocation();

  useEffect(() => {
    const routeTitles: Record<string, string> = {
      "/login": "Sign In",
      "/upload": "Upload Dataset",
      "/stats": "Stats",
    };

    document.title = routeTitles[location.pathname];
  }, [location.pathname]);

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/stats" element={<StatPage />} />
      </Route>
    </Routes>
  );
}

export default App;
