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

const handleRequest = createRequestHandler(
  build as unknown as ServerBuild,
  "production",
);

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, { cloudflare: { env, ctx } });
  },
} satisfies ExportedHandler<Env>;
