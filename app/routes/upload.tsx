import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/upload";
import { extractDecisaoFromPdf, fileToBase64 } from "~/lib/claude.server";
import { insertDecisao } from "~/lib/db.server";
import { sanitizeFilename } from "~/lib/sanitize";

// Limite alinhado ao que cabe confortavelmente no Worker (memória/CPU) e ao
// custo da chamada do modelo. STF normalmente emite PDFs bem abaixo disso.
const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

// Header de um PDF real: "%PDF-" (ASCII 0x25 50 44 46 2D). Validar contra o
// MIME type do form é trivial de spoofar — checar os primeiros bytes evita
// gastar tokens da Anthropic com arquivos disfarçados.
function hasPdfMagicBytes(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const head = new Uint8Array(buffer, 0, 5);
  return (
    head[0] === 0x25 && // %
    head[1] === 0x50 && // P
    head[2] === 0x44 && // D
    head[3] === 0x46 && // F
    head[4] === 0x2d //   -
  );
}

export const meta: Route.MetaFunction = () => [
  { title: "Nova decisão · Decisões STF" },
];

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

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
  if (file.size > MAX_PDF_BYTES) {
    return {
      ok: false as const,
      error: `PDF muito grande (${formatBytes(file.size)}). Tamanho máximo: ${formatBytes(MAX_PDF_BYTES)}.`,
    };
  }

  // Read once: valida magic bytes + reusa o buffer para base64. Evita segundo
  // arrayBuffer() em fileToBase64 (que faria streaming duplo).
  const buffer = await file.arrayBuffer();
  if (!hasPdfMagicBytes(buffer)) {
    return {
      ok: false as const,
      error:
        "Arquivo não é um PDF válido (header ausente). Envie um PDF real, não renomeie outros formatos.",
    };
  }

  // Sanitiza ANTES de logar / persistir — nomes de arquivo podem conter CPF,
  // CNPJ, nome de pessoa física, etc.
  const safeFilename = sanitizeFilename(file.name);

  try {
    const base64 = await fileToBase64(file);
    const extracted = await extractDecisaoFromPdf(apiKey, base64);
    const id = await insertDecisao(env.DB, {
      ...extracted,
      pdf_filename: safeFilename,
    });
    return redirect(`/decisao/${id}`);
  } catch (err) {
    const correlationId = crypto.randomUUID();
    console.error("[upload] falha ao processar PDF", {
      correlationId,
      fileName: safeFilename, // log o nome saneado, não o original
      fileSize: file.size,
      error: err,
    });
    return {
      ok: false as const,
      error: `Falha ao processar o PDF. Tente novamente. Se persistir, informe o código: ${correlationId}.`,
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

      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Aviso de privacidade:</strong> o PDF enviado é processado pela
        API da Anthropic (Claude) e armazenado em banco de dados na Cloudflare.
        Não envie decisões em <em>segredo de justiça</em> ou outros documentos
        sigilosos. CPF/CNPJ no nome do arquivo são removidos automaticamente.
      </div>

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
            Tamanho máximo: 15&nbsp;MB.
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
