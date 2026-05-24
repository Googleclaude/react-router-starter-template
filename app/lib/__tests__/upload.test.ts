import { describe, expect, it } from "vitest";
import { hasPdfMagicBytes } from "../upload.server";

function bufferFrom(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

describe("hasPdfMagicBytes", () => {
  it("aceita header %PDF- válido", () => {
    expect(hasPdfMagicBytes(bufferFrom("%PDF-1.7\nrest of file"))).toBe(true);
    expect(hasPdfMagicBytes(bufferFrom("%PDF-2.0"))).toBe(true);
  });

  it("rejeita buffer vazio", () => {
    expect(hasPdfMagicBytes(new ArrayBuffer(0))).toBe(false);
  });

  it("rejeita buffer com menos de 5 bytes", () => {
    expect(hasPdfMagicBytes(bufferFrom("%PDF"))).toBe(false);
    expect(hasPdfMagicBytes(bufferFrom("%"))).toBe(false);
  });

  it("rejeita header errado (ZIP)", () => {
    expect(hasPdfMagicBytes(bufferFrom("PK\x03\x04zip"))).toBe(false);
  });

  it("rejeita header errado (HTML)", () => {
    expect(hasPdfMagicBytes(bufferFrom("<html>fake</html>"))).toBe(false);
  });

  it("rejeita header de PDF disfarçado depois de texto", () => {
    // Magic bytes precisam estar no início, não no meio.
    expect(hasPdfMagicBytes(bufferFrom("junk%PDF-1.7"))).toBe(false);
  });
});
