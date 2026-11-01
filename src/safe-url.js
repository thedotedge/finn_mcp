const MAX_REDIRECTS = 5;

/**
 * Validate that a URL is HTTPS, has no embedded credentials, and targets an allowlisted host.
 * Returns the normalized href.
 */
export function assertAllowedHttpsUrl(rawUrl, allowedHosts) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new Error("URL is required");
  }
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) {
    throw new Error("allowedHosts is required");
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("Credentials in URLs are not allowed");
  }
  if (url.hostname !== url.hostname.toLowerCase()) {
    // Normalize; hosts are compared case-insensitively below.
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error(`Host not allowed: ${host}`);
  }
  if (isIpLiteral(host)) {
    throw new Error(`IP address hosts are not allowed: ${host}`);
  }

  const allowed = allowedHosts.some((entry) => hostMatches(host, entry));
  if (!allowed) {
    throw new Error(`Host not allowed: ${host}`);
  }

  return url.href;
}

function hostMatches(hostname, allowedHost) {
  const expected = String(allowedHost).toLowerCase();
  return hostname === expected || hostname.endsWith(`.${expected}`);
}

function isIpLiteral(hostname) {
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  // IPv6 (URL hostname may be bare or bracketed; WHATWG strips brackets in hostname)
  if (hostname.includes(":")) return true;
  return false;
}

/**
 * Follow redirects manually, re-validating every hop against the allowlist.
 */
export async function fetchAllowed(rawUrl, { allowedHosts, as = "text" } = {}) {
  let current = assertAllowedHttpsUrl(rawUrl, allowedHosts);

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const response = await fetch(current, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
      },
      redirect: "manual",
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`Redirect ${response.status} without Location header`);
      }
      // Resolve relative redirects against the current URL, then re-check allowlist.
      current = assertAllowedHttpsUrl(new URL(location, current).href, allowedHosts);
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (as === "json") return response.json();
    return response.text();
  }

  throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
}

export const FINN_HOSTS = ["www.finn.no", "finn.no"];
export const KLARNA_HOSTS = ["www.klarna.com", "klarna.com"];

/** Numeric FINN-kode only; blocks path traversal / open URL injection in path segments. */
export const FINN_CODE_PATTERN = /^\d{5,12}$/;
