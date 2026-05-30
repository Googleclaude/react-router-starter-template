import { Buffer } from "node:buffer";
import { extractDecisaoFromPdf } from "./claude.server";
import { insertDecisao } from "./db.server";
import { hasPdfMagicBytes } from "./pdf";
import { sanitizeFilename } from "./sanitize";
import { MAX_PDF_BYTES, type ProcessResult } from "./upload.shared";

export { MAX_PDF_BYTES, type ProcessResult };

// SDK errors can carry the full request/response payload (prompt content,
// API headers, etc.) on inner properties. Serializing them naively into the
// log puts that data in Cloudflare's log retention. Only emit the bits we
// need to debug: name, short message, and a truncated stack.
function summarizeError(err: unknown): {
  errorName?: string;
  errorMessage: string;
  errorStack?: string;
} {
  if (err instanceof Error) {
    return {
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack?.slice(0, 1000),
    };
  }
  return { errorMessage: String(err) };
}

// SDK errors can carry the full request/response payload (prompt content,
// API headers, etc.) on inner properties. Serializing them naively into the
// log puts that data in Cloudflare's log retention. Only emit the bits we
// need to debug: name, short message, and a truncated stack.
function summarizeError(err: unknown): {
  errorName?: string;
  errorMessage: string;
  errorStack?: string;
} {
  if (err instanceof Error) {
    return {
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack?.slice(0, 1000),
    };
  }
  return { errorMessage: String(err) };
}

/**
 * Receives a single PDF File, runs it through Claude for structured extraction,
 * persists the result in D1 and returns the new decision id (or a sanitized
 * error). Used by both the synchronous /upload action (single file) and the
 * /api/decisao resource route (called concurrently from /upload-lote).
 *
 * Security baked in:
 *   - filename sanitized (CPF/CNPJ stripping) before any logging or persist
 *   - PDF magic-byte verification before base64 + Anthropic call (hasPdfMagicBytes
 *     lives in ~/lib/pdf for unit-testability without server deps)
 *   - error messages sanitized, full detail logged server-side with UUID
 *   - error log strips inner Error properties (no SDK payloads in logs)
 */
export async function processUploadedPdf(
  env: Env,
  file: File,
): Promise<ProcessResult> {
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
      ...summarizeError(err),
    });
    return {
      ok: false,
      error: `Falha ao processar o PDF. Tente novamente. Se persistir, informe o código: ${correlationId}.`,
      correlationId,
      pdf_filename: safeFilename,
    };
  }
}
