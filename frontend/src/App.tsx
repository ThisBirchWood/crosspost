import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import DatasetsPage from "./pages/Datasets";
import DatasetStatusPage from "./pages/DatasetStatus";
import LoginPage from "./pages/Login";
import UploadPage from "./pages/Upload";
import AutoFetchPage from "./pages/AutoFetch";
import StatPage from "./pages/Stats";
import { getDocumentTitle } from "./utils/documentTitle";
import DatasetEditPage from "./pages/DatasetEdit";

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
        <Route path="/auto-fetch" element={<AutoFetchPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/dataset/:datasetId/status" element={<DatasetStatusPage />} />
        <Route path="/dataset/:datasetId/stats" element={<StatPage />} />
        <Route path="/dataset/:datasetId/edit" element={<DatasetEditPage />} />
      </Route>
    </Routes>
  );
}

export default App;
