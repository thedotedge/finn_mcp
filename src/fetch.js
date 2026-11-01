import { fetchAllowed } from "./safe-url.js";

export async function fetchHtml(url, { allowedHosts } = {}) {
  return fetchAllowed(url, { allowedHosts, as: "text" });
}

export async function fetchJson(url, { allowedHosts } = {}) {
  return fetchAllowed(url, { allowedHosts, as: "json" });
}
