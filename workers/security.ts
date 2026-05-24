// Helpers de segurança extraídos de workers/app.ts para que possam ser
// testados unitariamente sem inicializar o handler do React Router.

/** Constant-time string compare. Avoids leaking length‐class info via timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Parse `Authorization: Basic <base64>` and compare the password to `expected`
 * with constant-time compare. Username is ignored (browser prompt accepts any).
 * Returns false for any malformed input.
 */
export function checkBasicAuth(request: Request, expected: string): boolean {
  const header = request.headers.get("Authorization");
  if (!header || !header.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice("Basic ".length).trim());
  } catch {
    return false;
  }
  const idx = decoded.indexOf(":");
  if (idx === -1) return false;
  const password = decoded.slice(idx + 1);
  if (password.length === 0) return false;
  return safeEqual(password, expected);
}

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF defence using `Sec-Fetch-Site`. Modern browsers attach this header to
 * every navigation/fetch; programmatic clients (curl, scripts) do not. Block
 * only when the browser explicitly reports `cross-site`; treat missing /
 * `same-origin` / `same-site` / `none` as allowed.
 */
export function csrfCheck(request: Request): boolean {
  if (!STATE_CHANGING.has(request.method)) return true;
  const site = request.headers.get("Sec-Fetch-Site");
  return site !== "cross-site";
}
