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

// Build the handler once per isolate. Mode is sticky for the worker's
// lifetime — set NODE_ENV=production in deploy vars; leave it unset in
// `wrangler dev` so React Router renders dev-mode error pages with stack
// traces.
function buildHandler(env: Env) {
  const mode = env.NODE_ENV === "production" ? "production" : "development";
  return createRequestHandler(build as unknown as ServerBuild, mode);
}

let handleRequest: ReturnType<typeof buildHandler> | undefined;

// Constant-time string compare. Avoids leaking the password length and per-
// character match progress through response timing. xor each char, OR into
// `diff`; only return after the full loop.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function unauthorized(): Response {
  return new Response("401 Não autorizado", {
    status: 401,
    headers: {
      // Triggers the browser's native login prompt. `charset="UTF-8"` lets
      // browsers decode non-ASCII passwords correctly.
      "WWW-Authenticate": 'Basic realm="Decisões STF", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      // Don't let intermediate caches store the 401.
      "Cache-Control": "no-store",
    },
  });
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
  // Basic auth format is "username:password". Username is ignored — anything
  // works in the browser prompt; only the password must match.
  const idx = decoded.indexOf(":");
  if (idx === -1) return false;
  const password = decoded.slice(idx + 1);
  return safeEqual(password, expected);
}

export default {
  async fetch(request, env, ctx) {
    // Fail closed: if APP_PASSWORD isn't set as a secret, return 503 instead
    // of serving the app unprotected. Set via wrangler secret put or in the
    // Cloudflare dashboard (Workers → Settings → Variables and Secrets).
    if (!env.APP_PASSWORD) {
      return new Response(
        "APP_PASSWORD não configurado. Defina como secret no painel Cloudflare antes de acessar o app.",
        {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }
    if (!checkBasicAuth(request, env.APP_PASSWORD)) {
      return unauthorized();
    }
    if (!handleRequest) handleRequest = buildHandler(env);
    return handleRequest(request, { cloudflare: { env, ctx } });
  },
} satisfies ExportedHandler<Env>;
