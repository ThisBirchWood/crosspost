import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import DatasetStatusPage from "./pages/DatasetStatus";
import LoginPage from "./pages/Login";
import UploadPage from "./pages/Upload";
import StatPage from "./pages/Stats";
import { getDocumentTitle } from "./utils/documentTitle";

function App() {
  const location = useLocation();

  useEffect(() => {
    document.title = getDocumentTitle(location.pathname);
  }, [location.pathname]);

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/dataset/:datasetId/status" element={<DatasetStatusPage />} />
        <Route path="/dataset/:datasetId/stats" element={<StatPage />} />
      </Route>
    </Routes>
  );
}

export default App;
