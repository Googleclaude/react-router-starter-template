import { describe, expect, it } from "vitest";
import { formatDate } from "../format";

describe("formatDate", () => {
  it("formata ISO YYYY-MM-DD como dd/mm/yyyy", () => {
    expect(formatDate("2026-01-15")).toBe("15/01/2026");
  });

  it("devolve travessão para null/undefined", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  it("devolve string original quando não casa o padrão ISO", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
    expect(formatDate("15/01/2026")).toBe("15/01/2026");
  });

  it("normaliza para UTC (não varia com timezone)", () => {
    // Sem timezone:UTC, datas próximas à meia-noite poderiam virar dia
    // anterior em fusos a oeste. Esta data ancora o teste.
    expect(formatDate("2026-12-31")).toBe("31/12/2026");
  });
});
