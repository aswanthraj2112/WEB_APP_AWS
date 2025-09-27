const API_URL = import.meta.env.VITE_API_URL;

function buildHeaders(tokens, extra = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extra
  };
  if (tokens?.idToken) {
    headers.Authorization = `Bearer ${tokens.idToken}`;
  }
  return headers;
}

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      payload = { message: text || "Request failed" };
    }
    const error = new Error(payload.message || "Request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function createVideo({ title, file, tokens }) {
  const body = {
    title,
    filename: file.name,
    contentType: file.type,
    fileSizeMb: file.size / (1024 * 1024)
  };

  const response = await fetch(`${API_URL}/videos`, {
    method: "POST",
    headers: buildHeaders(tokens),
    body: JSON.stringify(body)
  });

  return handleResponse(response);
}

export async function uploadToS3(uploadUrl, file) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type
    },
    body: file
  });

  if (!response.ok) {
    throw new Error("Failed to upload to S3");
  }
}

export async function listVideos(tokens, params = {}) {
  const search = new URLSearchParams(params).toString();
  const url = search ? `${API_URL}/videos?${search}` : `${API_URL}/videos`;
  const response = await fetch(url, {
    headers: buildHeaders(tokens)
  });
  return handleResponse(response);
}

export async function getVideo(id, tokens) {
  const response = await fetch(`${API_URL}/videos/${id}`, {
    headers: buildHeaders(tokens)
  });
  return handleResponse(response);
}

export async function deleteVideo(id, tokens) {
  const response = await fetch(`${API_URL}/videos/${id}`, {
    method: "DELETE",
    headers: buildHeaders(tokens)
  });
  return handleResponse(response);
}
