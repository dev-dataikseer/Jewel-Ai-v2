import axios from "axios";

export const API_ORIGIN =
  process.env.NODE_ENV === "production"
    ? "" // Relative path in production since backend serves the frontend
    : process.env.NEXT_PUBLIC_API_ORIGIN?.replace(/\/$/, "") || "http://localhost:4000";

export const API_BASE = `${API_ORIGIN}/api`;

export const api = axios.create({
  baseURL: API_BASE,
});

export function mediaUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_ORIGIN}${url}`;
}
