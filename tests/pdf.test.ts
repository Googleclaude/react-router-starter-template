import { describe, expect, it } from "vitest";
import { hasPdfMagicBytes } from "~/lib/pdf";

function bufferFromBytes(...bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

describe("hasPdfMagicBytes", () => {
  it("aceita header válido %PDF-1.5", () => {
    // %PDF-1.5\n
    const buf = bufferFromBytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35, 0x0a);
    expect(hasPdfMagicBytes(buf)).toBe(true);
  });

  it("aceita header válido %PDF-1.7", () => {
    const buf = bufferFromBytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37);
    expect(hasPdfMagicBytes(buf)).toBe(true);
  });

  it("aceita header válido %PDF-2.0", () => {
    const buf = bufferFromBytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x32, 0x2e, 0x30);
    expect(hasPdfMagicBytes(buf)).toBe(true);
  });

  it("rejeita buffer vazio", () => {
    expect(hasPdfMagicBytes(new ArrayBuffer(0))).toBe(false);
  });

  it("rejeita buffer com menos de 5 bytes", () => {
    expect(hasPdfMagicBytes(bufferFromBytes(0x25, 0x50, 0x44, 0x46))).toBe(
      false,
    );
  });

  it("rejeita header de PNG (89 50 4E 47)", () => {
    const buf = bufferFromBytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a);
    expect(hasPdfMagicBytes(buf)).toBe(false);
  });

  it("rejeita header de ZIP/DOCX (PK..)", () => {
    const buf = bufferFromBytes(0x50, 0x4b, 0x03, 0x04, 0x14);
    expect(hasPdfMagicBytes(buf)).toBe(false);
  });

  it("rejeita header de executavel ELF", () => {
    const buf = bufferFromBytes(0x7f, 0x45, 0x4c, 0x46, 0x02);
    expect(hasPdfMagicBytes(buf)).toBe(false);
  });

  it("rejeita .pdf falso com bytes aleatórios", () => {
    const buf = bufferFromBytes(0xff, 0xd8, 0xff, 0xe0, 0x00); // JPEG
    expect(hasPdfMagicBytes(buf)).toBe(false);
  });

  it("rejeita PDF com 4 bytes corretos + 5º errado", () => {
    // %PDF + espaço (não '-')
    const buf = bufferFromBytes(0x25, 0x50, 0x44, 0x46, 0x20);
    expect(hasPdfMagicBytes(buf)).toBe(false);
  });
});
