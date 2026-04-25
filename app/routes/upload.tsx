import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/upload";
import { extractDecisaoFromPdf, fileToBase64 } from "~/lib/claude.server";
import { insertDecisao } from "~/lib/db.server";

export const meta: Route.MetaFunction = () => [
  { title: "Nova decisão · Decisões STF" },
];

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false as const,
      error:
        "ANTHROPIC_API_KEY não configurada. Defina como secret: `wrangler secret put ANTHROPIC_API_KEY`.",
    };
  }

  const form = await request.formData();
  const file = form.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Selecione um arquivo PDF." };
  }
  if (file.type && file.type !== "application/pdf") {
    return { ok: false as const, error: "O arquivo deve ser um PDF." };
  }

  try {
    const base64 = await fileToBase64(file);
    const extracted = await extractDecisaoFromPdf(apiKey, base64);
    const id = await insertDecisao(env.DB, {
      ...extracted,
      pdf_filename: file.name,
    });
    return redirect(`/decisao/${id}`);
  } catch (err) {
    return {
      ok: false as const,
      error: `Falha ao processar o PDF: ${(err as Error).message}`,
    };
  }
}

export default function Upload({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="text-sm text-slate-600 hover:underline">
        ← Voltar para a lista
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Nova decisão
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Envie o PDF da decisão. O sistema extrairá automaticamente os dados, a
        ementa e gerará resumo e tese jurídica.
      </p>

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
