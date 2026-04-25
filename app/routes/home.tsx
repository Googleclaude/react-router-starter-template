import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "React Router v7 + Cloudflare Workers" },
    { name: "description", content: "Starter template" },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  return {
    message:
      context.cloudflare.env.VALUE_FROM_CLOUDFLARE ?? "Hello from Cloudflare",
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <h1>React Router v7 + Cloudflare Workers</h1>
      <p>{loaderData.message}</p>
      <p>
        Edit <code>app/routes/home.tsx</code> to start building.
      </p>
    </main>
  );
}
