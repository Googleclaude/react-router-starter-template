// Shared between server (upload.server.ts) and client (routes/upload-lote.tsx).
// Keep this file free of any server-only imports (DB, Anthropic SDK, etc.).

export const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

export type ProcessResult =
  | { ok: true; id: number; pdf_filename: string }
  | { ok: false; error: string; correlationId?: string; pdf_filename: string };
