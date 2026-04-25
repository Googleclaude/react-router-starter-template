import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "React Router Starter" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-4xl font-bold">React Router Starter</h1>
        <p className="text-lg text-gray-600">
          Edit{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm">
            app/routes/home.tsx
          </code>{" "}
          to get started.
        </p>
        <a
          className="inline-block rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
          href="https://reactrouter.com/start/framework/installation"
          target="_blank"
          rel="noreferrer"
        >
          Read the docs
        </a>
      </div>
    </main>
  );
}
