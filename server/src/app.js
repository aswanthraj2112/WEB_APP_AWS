import express from "express";
import cors from "cors";
import morgan from "morgan";
import videosRouter from "./routes/videos.js";
import { authenticate } from "./middleware/auth.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/videos", authenticate, videosRouter);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error", err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
