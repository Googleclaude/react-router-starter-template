// PDF magic-byte validation extraída de upload.server.ts para ser testável
// sem dependências do servidor (Anthropic SDK, D1 binding). Função pura.
//
// Header de um PDF válido: bytes "%PDF-" (ASCII 0x25 0x50 0x44 0x46 0x2D).
// Validar contra `file.type` do form não protege — esse campo é controlado
// pelo cliente. Verificar os primeiros 5 bytes evita que um .exe ou .zip
// renomeado como `.pdf` chegue até a Anthropic e consuma tokens.
export function hasPdfMagicBytes(buffer: ArrayBuffer): boolean {
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
