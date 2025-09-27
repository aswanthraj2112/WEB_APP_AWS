import { useEffect, useState } from "react";
import { deleteVideo, listVideos } from "../api/client.js";
import { Toast } from "../components/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function AdminPage() {
  const { tokens, groups } = useAuth();
  const isAdmin = groups.includes("admins");
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      try {
        const data = await listVideos(tokens, { scope: "all" });
        setVideos(data.items || []);
      } catch (err) {
        setError(err.message);
      }
    };

    load();
  }, [tokens, isAdmin]);

  const handleDelete = async (videoId) => {
    if (!window.confirm("Delete this video and all related assets?")) return;
    try {
      await deleteVideo(videoId, tokens);
      setVideos((prev) => prev.filter((video) => video.videoId !== videoId));
      setMessage("Video deleted successfully");
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="main-content">
        <div className="card">You do not have permission to access this page.</div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="card">
        <h2>Admin Dashboard</h2>
        <p style={{ color: "#94a3b8" }}>
          Administrators can review and delete uploaded content across the platform. Deleting a
          record removes raw, transcoded, and thumbnail assets from S3.
        </p>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.videoId}>
                <td>{video.title}</td>
                <td>{video.ownerId}</td>
                <td>{video.status}</td>
                <td>{new Date(video.createdAt).toLocaleString()}</td>
                <td>
                  <button onClick={() => handleDelete(video.videoId)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Toast message={error || message} type={error ? "error" : "info"} />
    </div>
  );
}
