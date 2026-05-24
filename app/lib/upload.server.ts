import { Buffer } from "node:buffer";
import { extractDecisaoFromPdf } from "./claude.server";
import { insertDecisao } from "./db.server";
import { sanitizeFilename } from "./sanitize";
import { MAX_PDF_BYTES, type ProcessResult } from "./upload.shared";

export { MAX_PDF_BYTES, type ProcessResult };

// Header of a real PDF: "%PDF-" (ASCII 0x25 50 44 46 2D). The form's MIME
// type is client-controlled and trivially spoofable — verifying the leading
// bytes avoids wasting Anthropic tokens on disguised files.
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

/**
 * Receives a single PDF File, runs it through Claude for structured extraction,
 * persists the result in D1 and returns the new decision id (or a sanitized
 * error). Used by both the synchronous /upload action (single file) and the
 * /api/decisao resource route (called concurrently from /upload-lote).
 *
 * Security baked in:
 *   - filename sanitized (CPF/CNPJ stripping) before any logging or persist
 *   - PDF magic-byte verification before base64 + Anthropic call
 *   - error messages sanitized, full detail logged server-side with UUID
 */
export async function processUploadedPdf(
  env: Env,
  file: File,
): Promise<ProcessResult> {
  // Sanitize before anything else: filename ends up in logs and in the DB.
  const safeFilename = sanitizeFilename(file.name);

  if (!env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY não configurada. Defina como secret: `wrangler secret put ANTHROPIC_API_KEY`.",
      pdf_filename: safeFilename,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: "Arquivo vazio.", pdf_filename: safeFilename };
  }
  if (file.type && file.type !== "application/pdf") {
    return {
      ok: false,
      error: "O arquivo deve ser um PDF.",
      pdf_filename: safeFilename,
    };
  }
  if (file.size > MAX_PDF_BYTES) {
    return {
      ok: false,
      error: `PDF muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: ${(MAX_PDF_BYTES / 1024 / 1024).toFixed(0)} MB.`,
      pdf_filename: safeFilename,
    };
  }

  try {
    // Read once: validate magic bytes + reuse the buffer for base64. Avoids
    // a second arrayBuffer() call which would error on the already-consumed
    // blob in some Worker runtimes.
    const buffer = await file.arrayBuffer();
    if (!hasPdfMagicBytes(buffer)) {
      return {
        ok: false,
        error:
          "Arquivo não é um PDF válido (header ausente). Envie um PDF real, não renomeie outros formatos.",
        pdf_filename: safeFilename,
      };
    }
    const base64 = Buffer.from(buffer).toString("base64");
    const extracted = await extractDecisaoFromPdf(env.ANTHROPIC_API_KEY, base64);
    const id = await insertDecisao(env.DB, {
      ...extracted,
      pdf_filename: safeFilename,
    });
    return { ok: true, id, pdf_filename: safeFilename };
  } catch (err) {
    const correlationId = crypto.randomUUID();
    console.error("[processUploadedPdf] falha", {
      correlationId,
      fileName: safeFilename,
      fileSize: file.size,
      error: err,
    });
    return {
      ok: false,
      error: `Falha ao processar o PDF. Tente novamente. Se persistir, informe o código: ${correlationId}.`,
      correlationId,
      pdf_filename: safeFilename,
    };
  }
}
