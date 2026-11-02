export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const TOKEN_KEY = "munim-auth-token";

export const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const writeToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error storing auth token:", error);
  }
};

export const authHeaders = () => {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const UNREACHABLE =
  "Munim.AI can't be reached. Check your connection and try again.";

// Sends a request to the API, turning failures into errors that carry the
// server's message and the HTTP status
export const api = async (path, { method = "GET", body, form } = {}) => {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...authHeaders(),
      },
      body: form || (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new Error(UNREACHABLE);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      data?.message || data?.error || "That didn't work. Try again.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
};
