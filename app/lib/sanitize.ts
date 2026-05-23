// Helpers de saneamento usados em todos os pontos de upload.
//
// Mantenha este módulo sem imports do servidor (DB, SDK Anthropic) para que
// possa ser usado tanto em código de rota quanto em libs server-side.

const SAFE_FILENAME_CHARS = /[^A-Za-z0-9._\-\s\[\]áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ]/g;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_PATTERN = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const LONG_DIGITS = /\b\d{11,14}\b/g;

/**
 * Remove identificadores pessoais comuns (CPF, CNPJ, sequências longas de
 * dígitos) e caracteres incomuns do nome do arquivo antes de persistir no
 * banco ou logar. Objetivo é evitar vazar dado pessoal em logs do Cloudflare
 * Workers (que retemos por período definido pela Cloudflare) e na coluna
 * `pdf_filename` do D1.
 *
 * Não substitui um esquema de redaction completo — é best-effort focado em
 * padrões brasileiros mais comuns em nomes de arquivo de processo.
 */
export function sanitizeFilename(raw: string | null | undefined): string {
  if (!raw) return "decisao.pdf";
  let s = raw
    .replace(CPF_PATTERN, "[CPF]")
    .replace(CNPJ_PATTERN, "[CNPJ]")
    .replace(LONG_DIGITS, "[DIGITOS]");
  s = s.replace(SAFE_FILENAME_CHARS, "_");
  s = s.replace(/_{2,}/g, "_").replace(/\s{2,}/g, " ").trim();
  if (s.length > 200) s = s.slice(0, 200);
  return s || "decisao.pdf";
}
