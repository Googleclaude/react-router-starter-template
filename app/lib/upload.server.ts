import { extractDecisaoFromPdf, fileToBase64 } from "./claude.server";
import { insertDecisao } from "./db.server";
import { MAX_PDF_BYTES, type ProcessResult } from "./upload.shared";

export { MAX_PDF_BYTES, type ProcessResult };

/**
 * Receives a single PDF File, runs it through Claude for structured extraction,
 * persists the result in D1 and returns the new decision id (or a sanitized
 * error). Used by both the synchronous /upload action (single file) and the
 * /api/decisao resource route (called concurrently from /upload-lote).
 */
export async function processUploadedPdf(
  env: Env,
  file: File,
): Promise<ProcessResult> {
  const filename = file.name || "decisao.pdf";

  if (!env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY não configurada. Defina como secret: `wrangler secret put ANTHROPIC_API_KEY`.",
      pdf_filename: filename,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: "Arquivo vazio.", pdf_filename: filename };
  }
  if (file.type && file.type !== "application/pdf") {
    return {
      ok: false,
      error: "O arquivo deve ser um PDF.",
      pdf_filename: filename,
    };
  }
  if (file.size > MAX_PDF_BYTES) {
    return {
      ok: false,
      error: `PDF muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: ${(MAX_PDF_BYTES / 1024 / 1024).toFixed(0)} MB.`,
      pdf_filename: filename,
    };
  }

  try {
    const base64 = await fileToBase64(file);
    const extracted = await extractDecisaoFromPdf(env.ANTHROPIC_API_KEY, base64);
    const id = await insertDecisao(env.DB, {
      ...extracted,
      pdf_filename: filename,
    });
    return { ok: true, id, pdf_filename: filename };
  } catch (err) {
    const correlationId = crypto.randomUUID();
    console.error("[processUploadedPdf] falha", {
      correlationId,
      fileName: filename,
      fileSize: file.size,
      error: err,
    });
    return {
      ok: false,
      error: `Falha ao processar o PDF. Tente novamente. Se persistir, informe o código: ${correlationId}.`,
      correlationId,
      pdf_filename: filename,
    };
  }
}
