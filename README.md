# React Router Starter Template

A minimal, production-ready starter for [React Router v7](https://reactrouter.com) framework mode with TypeScript, Vite, and Tailwind CSS v4.

## Features

- Server-side rendering
- TypeScript with `~/*` path alias for `app/*`
- Tailwind CSS v4 via `@tailwindcss/vite`
- Hot module replacement in development
- Production build with `@react-router/serve`

## Getting started

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run the production server:

```bash
npm start
```

## Project structure

```
app/
  app.css           # Tailwind entry + global styles
  root.tsx          # Document shell + error boundary
  routes.ts         # Route config
  routes/
    home.tsx        # Index route
react-router.config.ts
vite.config.ts
tsconfig.json
```

## Type checking

```bash
npm run typecheck
```

This runs `react-router typegen` to generate route types under `.react-router/types`, then `tsc` to check the project.
