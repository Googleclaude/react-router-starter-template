// Cloudflare Workers `Env` augmentation for secrets/vars not declared in
// wrangler.jsonc. `wrangler types` regenerates `worker-configuration.d.ts`
// from wrangler.jsonc only — secrets must be declared here so TypeScript
// sees them via the `Env` interface inside loaders/actions.
interface Env {
  ANTHROPIC_API_KEY: string;
  // Optional. Set to "production" in `[env.production.vars]` of wrangler.jsonc
  // (or via `wrangler deploy --var NODE_ENV:production`) so the React Router
  // request handler runs in production mode in deploys; left unset (or any
  // other value) during `wrangler dev` to surface dev-time error pages.
  NODE_ENV?: string;
}
