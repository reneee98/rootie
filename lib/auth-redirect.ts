/** Keep authentication redirects within the app and avoid auth-page loops. */
export function normalizeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) {
      return fallback;
    }
    const url = new URL(value, "https://rootie.invalid");
    if (
      url.origin !== "https://rootie.invalid" ||
      ["/login", "/signup", "/auth/callback"].includes(decodeURIComponent(url.pathname).replace(/\/$/, ""))
    ) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
