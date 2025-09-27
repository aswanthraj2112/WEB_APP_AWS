import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createVideo, uploadToS3 } from "../api/client.js";
import { Toast } from "../components/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function UploadPage() {
  const { tokens } = useAuth();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Please select a video file");
      return;
    }

    try {
      setStatus("Requesting upload URL...");
      const { uploadUrl, videoId } = await createVideo({ title, file, tokens });
      setStatus("Uploading to S3...");
      await uploadToS3(uploadUrl, file);
      setStatus("Upload completed. Transcoding will begin shortly.");
      setTimeout(() => navigate(`/videos`), 1500);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="main-content">
      <div className="card">
        <h2>Upload Video</h2>
        <p style={{ color: "#94a3b8" }}>
          Upload raw footage to S3 using a presigned URL. Once uploaded, our ffmpeg-based
          pipeline will transcode and generate adaptive streams.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <label htmlFor="file">Video File</label>
          <input
            id="file"
            type="file"
            accept="video/*"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            required
          />
          <button className="button-primary" type="submit">
            Upload
          </button>
        </form>
      </div>
      <Toast message={error || status} type={error ? "error" : "info"} />
    </div>
  );
}
