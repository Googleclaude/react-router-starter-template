# react-router-starter-template

React Router v7 (framework mode) + Cloudflare Workers starter.

## Stack

- React Router v7 framework mode (SSR on)
- Vite 6
- Cloudflare Workers via `@cloudflare/vite-plugin`
- TypeScript strict mode

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Deploy

```bash
npm run deploy
```

## Type generation

```bash
npm run typecheck
```

## Environment variables

Copy `.dev.vars.example` to `.dev.vars` for local dev. For production, configure
via `wrangler secret put` or the Cloudflare dashboard.
