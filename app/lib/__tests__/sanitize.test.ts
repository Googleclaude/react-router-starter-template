import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "../sanitize";

describe("sanitizeFilename", () => {
  it("redacts CPF (com máscara)", () => {
    expect(sanitizeFilename("processo-123.456.789-00.pdf")).not.toMatch(
      /\d{3}\.\d{3}\.\d{3}-\d{2}/,
    );
    expect(sanitizeFilename("processo-123.456.789-00.pdf")).toContain("[CPF]");
  });

  it("redacts CPF (sem máscara)", () => {
    expect(sanitizeFilename("12345678900-recurso.pdf")).not.toMatch(/\d{11}/);
  });

  it("redacts CNPJ (com máscara)", () => {
    expect(
      sanitizeFilename("empresa-12.345.678/0001-90-acordao.pdf"),
    ).toContain("[CNPJ]");
  });

  it("redacts CNPJ (sem máscara, 14 dígitos)", () => {
    expect(sanitizeFilename("12345678000190-decisao.pdf")).not.toMatch(
      /\d{14}/,
    );
  });

  it("preserva acentos PT-BR", () => {
    expect(sanitizeFilename("decisão-ação.pdf")).toMatch(/decisão-ação/);
  });

  it("fallback para nome vazio ou nulo", () => {
    expect(sanitizeFilename("")).toBe("decisao.pdf");
    expect(sanitizeFilename(null)).toBe("decisao.pdf");
    expect(sanitizeFilename(undefined)).toBe("decisao.pdf");
  });

  it("trunca em 200 chars", () => {
    expect(sanitizeFilename("a".repeat(300)).length).toBeLessThanOrEqual(200);
  });

  it("substitui caracteres incomuns por underscore", () => {
    expect(sanitizeFilename("file<>:|?*name.pdf")).not.toMatch(/[<>:|?*]/);
  });
});
