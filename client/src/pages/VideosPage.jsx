import { useEffect, useState } from "react";
import { listVideos } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Toast } from "../components/Toast.jsx";

export function VideosPage() {
  const { tokens } = useAuth();
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listVideos(tokens);
        setVideos(data.items || []);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tokens]);

  if (loading) {
    return (
      <div className="main-content">
        <div className="card">Loading your video library...</div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="card">
        <h2>My Videos</h2>
        {videos.length === 0 && <p>No videos yet. Upload one to get started!</p>}
        <div className="video-grid">
          {videos.map((video) => (
            <article className="video-card" key={video.videoId}>
              {video.thumbnailUrl ? (
                <img src={video.thumbnailUrl} alt={video.title} />
              ) : video.playbackUrl ? (
                <video controls src={video.playbackUrl} />
              ) : (
                <div style={{ padding: "2rem", textAlign: "center" }}>Processing...</div>
              )}
              <div className="video-card-content">
                <h3>{video.title}</h3>
                <span className="status-chip">{video.status}</span>
                <small>Uploaded: {new Date(video.createdAt).toLocaleString()}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
      <Toast message={error} type="error" />
    </div>
  );
}
