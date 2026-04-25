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

export default {
  async fetch(request, env, ctx) {
    if (!handleRequest) handleRequest = buildHandler(env);
    return handleRequest(request, { cloudflare: { env, ctx } });
  },
} satisfies ExportedHandler<Env>;
