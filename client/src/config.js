const DEFAULT_API_BASE_PATH = "/api";

function normaliseBaseUrl(url) {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const envValue = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_URL : undefined;
  const trimmed = typeof envValue === "string" ? envValue.trim() : "";
  const baseUrl = trimmed || DEFAULT_API_BASE_PATH;
  const normalised = normaliseBaseUrl(baseUrl);
  if (!normalised) {
    throw new Error("API base URL could not be determined. Set VITE_API_URL or configure a proxy at '/api'.");
  }
  return normalised;
}
