import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "~/lib/sanitize";

describe("sanitizeFilename", () => {
  it("retorna default quando input é null/undefined/vazio", () => {
    expect(sanitizeFilename(null)).toBe("decisao.pdf");
    expect(sanitizeFilename(undefined)).toBe("decisao.pdf");
    expect(sanitizeFilename("")).toBe("decisao.pdf");
  });

  it("preserva nome limpo", () => {
    expect(sanitizeFilename("decisao_normal.pdf")).toBe("decisao_normal.pdf");
  });

  it("strip CPF formatado (XXX.XXX.XXX-XX)", () => {
    const out = sanitizeFilename("Processo 123.456.789-00.pdf");
    expect(out).toContain("[CPF]");
    expect(out).not.toContain("123.456.789-00");
    expect(out).not.toContain("12345678900");
  });

  it("strip CPF sem formatação (11 dígitos)", () => {
    const out = sanitizeFilename("doc 12345678901.pdf");
    // Pode cair em [CPF] (regra específica) ou [DIGITOS] (fallback genérico)
    expect(out).toMatch(/\[(CPF|DIGITOS)\]/);
    expect(out).not.toContain("12345678901");
  });

  it("strip CNPJ formatado", () => {
    const out = sanitizeFilename("Empresa 12.345.678/0001-99.pdf");
    expect(out).toContain("[CNPJ]");
    expect(out).not.toContain("12.345.678/0001-99");
  });

  it("preserva acentos do português", () => {
    expect(sanitizeFilename("Decisão.pdf")).toBe("Decisão.pdf");
    expect(sanitizeFilename("Acórdão STF.pdf")).toBe("Acórdão STF.pdf");
  });

  it("substitui caracteres especiais por _", () => {
    const out = sanitizeFilename("file<weird>name.pdf");
    expect(out).toBe("file_weird_name.pdf");
  });

  it("colapsa underscores e espaços múltiplos", () => {
    const out = sanitizeFilename("a   b____c.pdf");
    // Sem múltiplos espaços consecutivos ou underscores consecutivos
    expect(out).not.toMatch(/__/);
    expect(out).not.toMatch(/  /);
  });

  it("trunca em 200 caracteres", () => {
    const huge = "a".repeat(300) + ".pdf";
    expect(sanitizeFilename(huge).length).toBeLessThanOrEqual(200);
  });

  it("sanitiza combinando CPF + CNPJ + acentos", () => {
    const out = sanitizeFilename(
      "Acórdão João Silva CPF 123.456.789-00 CNPJ 12.345.678/0001-99.pdf",
    );
    expect(out).toContain("[CPF]");
    expect(out).toContain("[CNPJ]");
    expect(out).toContain("Acórdão");
    expect(out).toContain("João");
    expect(out).not.toContain("123.456.789");
    expect(out).not.toContain("12.345.678/0001");
  });
});
