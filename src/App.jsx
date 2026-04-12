import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ResultPage from "./pages/ResultPage";

import HistoryPage from "./pages/HistoryPage";
import SourcesPage from "./pages/SourcesPage";
import AboutPage from "./pages/AboutPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#AEADA6" }}>
      Loading…
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/result" element={<ResultPage />} />
      {/* Phase 2 routes — add here later */}
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/sources" element={<SourcesPage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
