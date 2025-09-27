let cachedApiUrl;

function normalise(url) {
  return url.replace(/\/$/, "");
}

export function getApiUrl() {
  if (cachedApiUrl) {
    return cachedApiUrl;
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    cachedApiUrl = normalise(envUrl.trim());
    return cachedApiUrl;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    cachedApiUrl = `${normalise(window.location.origin)}/api`;
    return cachedApiUrl;
  }

  throw new Error("Unable to determine API base URL. Set VITE_API_URL in the frontend environment configuration.");
}
