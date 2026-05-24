// Shared between server (upload.server.ts) and client (routes/upload-lote.tsx).
// Keep this file free of any server-only imports (DB, Anthropic SDK, etc.).

export const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

export type ProcessResult =
  | { ok: true; id: number; pdf_filename: string }
  | { ok: false; error: string; correlationId?: string; pdf_filename: string };

/**
 * Formata bytes como MB para mensagens ao usuário. Centralizado aqui para
 * que cliente e servidor mostrem o mesmo número.
 */
export function bytesToMB(bytes: number, digits = 1): string {
  return `${(bytes / 1024 / 1024).toFixed(digits)} MB`;
}
