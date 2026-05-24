import { createRequestHandler, type ServerBuild } from "react-router";
// build/server/index.js is produced by `react-router build`. On a fresh
// checkout it doesn't exist yet — run `npm run build` once before
// `npm run typecheck`. Wrangler bundles this file from the entry below.
// @ts-ignore
import * as build from "../build/server/index.js";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

// ---------------------------------------------------------------------------
// Build the React Router handler once per isolate. Mode is sticky for the
// worker's lifetime — set NODE_ENV=production in deploy vars; leave it unset
// in `wrangler dev` so React Router renders dev-mode error pages.
function buildHandler(env: Env) {
  const mode = env.NODE_ENV === "production" ? "production" : "development";
  return createRequestHandler(build as unknown as ServerBuild, mode);
}

let handleRequest: ReturnType<typeof buildHandler> | undefined;

// ---------------------------------------------------------------------------
// Basic Auth

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function unauthorized(): Response {
  return withSecurityHeaders(
    new Response("401 Não autorizado", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Decisões STF", charset="UTF-8"',
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }),
  );
}

function checkBasicAuth(request: Request, expected: string): boolean {
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
  return safeEqual(password, expected);
}

// ---------------------------------------------------------------------------
// CSRF (Sec-Fetch-Site)
//
// Basic Auth credentials are auto-attached by the browser on every request to
// the protected origin — including cross-origin POSTs from a malicious page.
// We can't use SameSite cookies (no cookies), so use `Sec-Fetch-Site` (sent
// by every modern browser) to reject cross-site state-changing requests.
//
// Programmatic clients (curl, scripts) don't send Sec-Fetch-Site at all;
// allow those through — the Basic Auth check above is their security
// boundary. Browsers (the only CSRF vector that matters) DO send it, so
// drive-by POSTs from foreign tabs are blocked.
const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function csrfCheck(request: Request): boolean {
  if (!STATE_CHANGING.has(request.method)) return true;
  const site = request.headers.get("Sec-Fetch-Site");
  // Block only when browser explicitly reports cross-site. Missing header,
  // 'same-origin', 'same-site', and 'none' are all OK.
  return site !== "cross-site";
}

function csrfBlocked(): Response {
  return withSecurityHeaders(
    new Response("403 Origem não autorizada (CSRF)", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    }),
  );
}

// ---------------------------------------------------------------------------
// Security response headers (defense in depth)

// CSP baseline. React Router hydrates via inline <script> blocks, so
// `script-src` requires 'unsafe-inline' until we wire nonces through
// entry.server.tsx. Style is inline as well (Tailwind classes are inlined
// only at build time, but Google Fonts injects a <style> tag at runtime).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  // HTTPS only on the Cloudflare edge; once a browser sees this it pins HTTPS
  // for the next year. Don't include subdomains — the workers.dev parent zone
  // would inherit.
  "Strict-Transport-Security": "max-age=31536000",
  // Block MIME sniffing — browsers must use the Content-Type we set.
  "X-Content-Type-Options": "nosniff",
  // No framing at all (clickjacking). frame-ancestors in CSP is the modern
  // equivalent; keep XFO for older browsers.
  "X-Frame-Options": "DENY",
  // On cross-origin nav, only send the origin (not full URL) as referrer.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Drop powerful features we don't need.
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()",
  // Defense in depth — restrict cross-origin window access (Spectre).
  "Cross-Origin-Opener-Policy": "same-origin",
  // Cross-origin sites can't embed/read our responses as resources.
  "Cross-Origin-Resource-Policy": "same-origin",
  // Legacy Flash/PDF cross-domain policy — disabled.
  "X-Permitted-Cross-Domain-Policies": "none",
  "Content-Security-Policy": CSP,
};

function withSecurityHeaders(response: Response): Response {
  // Clone headers — some upstream responses have immutable Headers. Body is a
  // ReadableStream and is preserved through the new Response (no buffering).
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ---------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    // Fail closed when the gate secret isn't configured.
    if (!env.APP_PASSWORD) {
      return withSecurityHeaders(
        new Response(
          "APP_PASSWORD não configurado. Defina como secret no painel Cloudflare antes de acessar o app.",
          {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          },
        ),
      );
    }
    if (!checkBasicAuth(request, env.APP_PASSWORD)) {
      return unauthorized();
    }
    if (!csrfCheck(request)) {
      return csrfBlocked();
    }
    if (!handleRequest) handleRequest = buildHandler(env);
    const response = await handleRequest(request, {
      cloudflare: { env, ctx },
    });
    return withSecurityHeaders(response);
  },
} satisfies ExportedHandler<Env>;
