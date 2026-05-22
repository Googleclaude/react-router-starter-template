import type { Route } from "./+types/api.decisao";
import { processUploadedPdf } from "~/lib/upload.server";

/**
 * Resource route — JSON API used by /upload-lote to dispatch each PDF as a
 * separate request. One worker invocation per file keeps each call inside
 * Cloudflare's per-request limits and lets the client orchestrate
 * concurrency, retries and progress.
 */
export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json(
      { ok: false, error: "Método não permitido." },
      { status: 405 },
    );
  }

  const form = await request.formData();
  const file = form.get("pdf");
  if (!(file instanceof File)) {
    return Response.json(
      { ok: false, error: "Campo 'pdf' ausente ou inválido." },
      { status: 400 },
    );
  }

  const result = await processUploadedPdf(context.cloudflare.env, file);
  return Response.json(result, { status: result.ok ? 200 : 422 });
}

// Reject GETs explicitly so accidental browser visits don't hit the
// extraction pipeline.
export async function loader() {
  return Response.json(
    { ok: false, error: "Use POST com multipart/form-data." },
    { status: 405 },
  );
}
