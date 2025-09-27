import http from "http";
import app from "./app.js";
import { loadConfig, getConfig } from "./config.js";

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await loadConfig();
    const config = await getConfig();
    console.log("Configuration loaded", {
      region: config.region,
      dynamoTable: config.dynamoTable,
      s3Bucket: config.s3Bucket
    });

    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to bootstrap application", error);
    process.exit(1);
  }
}

start();
