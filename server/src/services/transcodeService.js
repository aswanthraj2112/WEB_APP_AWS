import { updateVideo } from "./dynamoService.js";

/**
 * Placeholder for an asynchronous transcoding pipeline.
 * In production this should trigger AWS MediaConvert / Lambda to transcode and
 * generate thumbnails. For this assignment we optimistically mark the video as
 * PROCESSING immediately and expect an external workflow to update status and
 * s3 keys once transcoding completes.
 */
export async function markVideoForTranscoding(videoId) {
  await updateVideo(videoId, {
    status: "PROCESSING",
    updatedAt: new Date().toISOString()
  });
}
