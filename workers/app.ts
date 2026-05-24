import { createRequestHandler, type ServerBuild } from "react-router";
// build/server/index.js is produced by `react-router build`. On a fresh
// checkout it doesn't exist yet — run `npm run build` once before
// `npm run typecheck`. Wrangler bundles this file from the entry below.
// @ts-ignore
import * as build from "../build/server/index.js";
import { checkBasicAuth, csrfCheck } from "./security";

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

function csrfBlocked(): Response {
  return withSecurityHeaders(
    new Response("403 Origem não autorizada (CSRF)", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    }),
  );
}

// ---------------------------------------------------------------------------
// Content Security Policy
//
// Locks down where the browser is allowed to load resources from. The app
// loads:
//   - scripts: only same-origin (React Router emits <script src="/assets/..">
//     in prod; no inline scripts in our code)
//   - styles: same-origin (Tailwind-emitted CSS) + Google Fonts CSS endpoint.
//     'unsafe-inline' is kept for style because React/React Router may inject
//     small inline style attributes for hydration / view transitions; the
//     style-src-attr is *less* dangerous than script-src-attr.
//   - fonts: Google Fonts CDN
//   - images: same-origin + data: (inline SVG/PNG used by some libs)
//   - connect: same-origin (no third-party XHR/WebSocket)
// frame-ancestors duplicates X-Frame-Options for browsers that prefer CSP.
// object-src 'none' kills <embed>/<object>/<applet>.
// upgrade-insecure-requests forces any http:// subresource to https://.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// ---------------------------------------------------------------------------
// Security response headers (defense in depth)

const SECURITY_HEADERS: Record<string, string> = {
  // Pin HTTPS for 1 year. Subdomains of `*.workers.dev` are treated as
  // independent eTLD+1 entries (workers.dev is on the Public Suffix List),
  // so includeSubDomains here brings no benefit on the default deploy
  // domain — add it explicitly only when a custom domain controls real
  // subdomains.
  "Strict-Transport-Security": "max-age=31536000",
  // Block MIME sniffing — browsers must use the Content-Type we set.
  "X-Content-Type-Options": "nosniff",
  // No framing at all (clickjacking).
  "X-Frame-Options": "DENY",
  // On cross-origin nav, only send the origin (not full URL) as referrer.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Drop powerful features we don't need.
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()",
  // Strict resource policy: ditches XSS, data exfil, and Spectre-style
  // cross-origin reads.
  "Content-Security-Policy": CSP,
  // Process-isolate this origin from cross-origin popups/iframes (mitigates
  // Spectre and cross-origin info leaks via window.opener).
  "Cross-Origin-Opener-Policy": "same-origin",
  // Refuse to be loaded as a subresource by other origins (img/script/etc.).
  // 'same-origin' is strict; if a CDN needs to embed us later we relax this.
  "Cross-Origin-Resource-Policy": "same-origin",
  // Legacy: blocks Flash / Adobe Reader cross-domain policy files. Flash is
  // dead but the header still ships in scanners' checklists.
  "X-Permitted-Cross-Domain-Policies": "none",
  // Belt-and-suspenders against MIME-confusion XSS for downloaded files.
  "X-Download-Options": "noopen",
};

// MIME types whose Content-Type we want to ensure carries `charset=utf-8`.
// Forgetting the charset on text/html (or having it set wrong) can let the
// browser sniff encoding from byte patterns, which has historically enabled
// UTF-7 XSS and similar tricks.
const TEXTUAL_MIME_PREFIXES = [
  "text/html",
  "text/plain",
  "text/css",
  "text/xml",
  "application/json",
  "application/javascript",
  "application/xml",
  "application/xhtml+xml",
  "image/svg+xml",
];

function ensureCharset(contentType: string | null): string | null {
  if (!contentType) return null;
  const lower = contentType.toLowerCase();
  if (lower.includes("charset=")) return contentType;
  const isTextual = TEXTUAL_MIME_PREFIXES.some((prefix) =>
    lower.startsWith(prefix),
  );
  if (!isTextual) return contentType;
  return `${contentType}; charset=utf-8`;
}

function withSecurityHeaders(response: Response): Response {
  // Clone headers — some upstream responses have immutable Headers. Body is a
  // ReadableStream and is preserved through the new Response (no buffering).
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  // Reinforce charset on textual responses if missing.
  const ct = ensureCharset(headers.get("Content-Type"));
  if (ct && ct !== headers.get("Content-Type")) {
    headers.set("Content-Type", ct);
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
