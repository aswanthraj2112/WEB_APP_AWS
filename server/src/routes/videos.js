import express from "express";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { getConfig } from "../config.js";
import {
  putVideo,
  getVideo as getVideoById,
  listVideosByOwner,
  deleteVideo as deleteVideoRecord,
  listAllVideos
} from "../services/dynamoService.js";
import { createUploadUrl, createPlaybackUrl, deleteObject } from "../services/s3Service.js";
import { markVideoForTranscoding } from "../services/transcodeService.js";

const router = express.Router();

function resolveExtension(filename) {
  if (!filename) return "";
  const ext = path.extname(filename);
  return ext || "";
}

function userIsAdmin(user) {
  const groups = user?.["cognito:groups"];
  if (!groups) return false;
  if (Array.isArray(groups)) {
    return groups.includes("admins");
  }
  if (typeof groups === "string") {
    return groups.split(",").includes("admins");
  }
  return false;
}

router.post("/", async (req, res) => {
  try {
    const config = await getConfig();
    const { title, filename, contentType, fileSizeMb } = req.body;

    if (!title || !filename || !contentType) {
      return res.status(400).json({ message: "title, filename and contentType are required" });
    }

    if (fileSizeMb && Number(fileSizeMb) > config.maxUploadSizeMb) {
      return res.status(400).json({ message: `File exceeds max upload size of ${config.maxUploadSizeMb} MB` });
    }

    const videoId = uuidv4();
    const ownerId = req.user.sub;
    const now = new Date().toISOString();
    const extension = resolveExtension(filename);
    const rawKey = `${config.s3RawPrefix}${videoId}${extension}`;

    const videoRecord = {
      videoId,
      ownerId,
      title,
      s3Key: rawKey,
      status: "UPLOADING",
      createdAt: now,
      updatedAt: now
    };

    await putVideo(videoRecord);

    const uploadUrl = await createUploadUrl({
      key: rawKey,
      contentType,
      ttl: config.preSignedUrlTTL
    });

    // Trigger downstream transcoding workflow asynchronously.
    markVideoForTranscoding(videoId).catch((err) => {
      console.error("Failed to mark video for transcoding", err);
    });

    return res.status(201).json({
      videoId,
      uploadUrl,
      s3Key: rawKey
    });
  } catch (error) {
    console.error("Failed to create upload URL", error);
    return res.status(500).json({ message: "Failed to prepare upload" });
  }
});

router.get("/", async (req, res) => {
  try {
    const config = await getConfig();
    const scope = req.query.scope;
    let videos;
    if (scope === "all" && userIsAdmin(req.user)) {
      videos = await listAllVideos();
    } else {
      const ownerId = req.user.sub;
      videos = await listVideosByOwner(ownerId);
    }

    const enriched = await Promise.all(
      videos.map(async (video) => {
        const playbackKey = video.transcodedKey || video.s3Key;
        const [playbackUrl, thumbnailUrl] = await Promise.all([
          createPlaybackUrl(playbackKey, config.preSignedUrlTTL),
          createPlaybackUrl(video.thumbnailKey, config.preSignedUrlTTL)
        ]);
        return {
          ...video,
          playbackUrl,
          thumbnailUrl
        };
      })
    );

    return res.json({ items: enriched });
  } catch (error) {
    console.error("Failed to list videos", error);
    return res.status(500).json({ message: "Failed to list videos" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const config = await getConfig();
    const { id } = req.params;
    const video = await getVideoById(id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const isOwner = video.ownerId === req.user.sub;
    if (!isOwner && !userIsAdmin(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const playbackKey = video.transcodedKey || video.s3Key;
    const [playbackUrl, thumbnailUrl] = await Promise.all([
      createPlaybackUrl(playbackKey, config.preSignedUrlTTL),
      createPlaybackUrl(video.thumbnailKey, config.preSignedUrlTTL)
    ]);

    return res.json({
      ...video,
      playbackUrl,
      thumbnailUrl
    });
  } catch (error) {
    console.error("Failed to load video", error);
    return res.status(500).json({ message: "Failed to load video" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!userIsAdmin(req.user)) {
      return res.status(403).json({ message: "Admin privileges required" });
    }
    const { id } = req.params;
    const video = await getVideoById(id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    await deleteVideoRecord(id);

    const keysToDelete = [video.s3Key, video.transcodedKey, video.thumbnailKey].filter(Boolean);
    await Promise.all(
      keysToDelete.map((key) =>
        deleteObject(key).catch((err) => {
          console.error(`Failed to delete S3 object ${key}`, err);
        })
      )
    );

    return res.status(204).send();
  } catch (error) {
    console.error("Failed to delete video", error);
    return res.status(500).json({ message: "Failed to delete video" });
  }
});

export default router;
