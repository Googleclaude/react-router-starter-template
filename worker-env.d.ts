// Cloudflare Workers `Env` augmentation for secrets/vars not declared in
// wrangler.jsonc. `wrangler types` regenerates `worker-configuration.d.ts`
// from wrangler.jsonc only — secrets must be declared here so TypeScript
// sees them via the `Env` interface inside loaders/actions.
interface Env {
  ANTHROPIC_API_KEY: string;
}
