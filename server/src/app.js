import express from "express";
import cors from "cors";
import morgan from "morgan";
import videosRouter from "./routes/videos.js";
import { authenticate } from "./middleware/auth.js";
import { getConfig } from "./config.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/config", async (_req, res, next) => {
  try {
    const config = await getConfig();
    res.json({
      region: config.region,
      userPoolId: config.cognitoUserPoolId,
      userPoolClientId: config.cognitoClientId,
      domain: config.domainName
    });
  } catch (error) {
    next(error);
  }
});

app.use("/videos", authenticate, videosRouter);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error", err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
