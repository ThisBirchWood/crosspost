import { Routes, Route } from "react-router-dom";
import UploadPage from "./pages/Upload";
import StatPage from "./pages/Stats";

function App() {
  return (
    <Routes>
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/stats" element={<StatPage />} />
    </Routes>
  );
}

export default App;
