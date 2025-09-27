import { Navigate, Route, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { UploadPage } from "./pages/UploadPage.jsx";
import { VideosPage } from "./pages/VideosPage.jsx";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="main-content">
        <div className="card">Loading...</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <div className="app-shell">
      <NavBar />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/videos" replace /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/upload"
          element={
            <RequireAuth>
              <UploadPage />
            </RequireAuth>
          }
        />
        <Route
          path="/videos"
          element={
            <RequireAuth>
              <VideosPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminPage />
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  );
}
