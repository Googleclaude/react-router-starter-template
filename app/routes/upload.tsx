import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/upload";
import { PrivacyNotice } from "~/components/privacy-notice";
import { processUploadedPdf } from "~/lib/upload.server";
import { bytesToMB, MAX_PDF_BYTES } from "~/lib/upload.shared";

export const meta: Route.MetaFunction = () => [
  { title: "Nova decisão · Decisões STF" },
];

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const file = form.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Selecione um arquivo PDF." };
  }

  // All validation (magic bytes, size, MIME, filename sanitization) and the
  // Anthropic + D1 calls live in processUploadedPdf so /upload and the JSON
  // API at /api/decisao share the exact same pipeline.
  const result = await processUploadedPdf(context.cloudflare.env, file);
  if (result.ok) return redirect(`/decisao/${result.id}`);
  return { ok: false as const, error: result.error };
}

export default function Upload({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="text-sm text-slate-600 hover:underline">
        ← Voltar para a lista
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">Nova decisão</h1>
      <p className="mt-1 text-sm text-slate-600">
        Envie o PDF da decisão. O sistema extrairá automaticamente os dados, a
        ementa e gerará resumo e tese jurídica.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Para enviar várias decisões de uma vez,{" "}
        <Link to="/upload-lote" className="font-medium underline">
          use o upload em lote
        </Link>
        .
      </p>

      <PrivacyNotice />

      <Form
        method="post"
        encType="multipart/form-data"
        className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="pdf"
            className="block text-sm font-medium text-slate-700"
          >
            Arquivo PDF
          </label>
          <input
            id="pdf"
            name="pdf"
            type="file"
            accept="application/pdf"
            required
            disabled={isSubmitting}
            className="mt-2 block w-full cursor-pointer rounded-md border border-slate-300 bg-slate-50 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
          />
          <p className="mt-1 text-xs text-slate-500">
            Tamanho máximo: {bytesToMB(MAX_PDF_BYTES, 0)}.
          </p>
        </div>

        {actionData && actionData.ok === false ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {actionData.error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Processando com IA…" : "Enviar e processar"}
        </button>

        {isSubmitting ? (
          <p className="text-center text-xs text-slate-500">
            A análise pode levar de 30 a 90 segundos por decisão.
          </p>
        ) : null}
      </Form>
    </main>
  );
}
