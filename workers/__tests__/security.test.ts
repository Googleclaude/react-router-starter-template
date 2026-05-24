import { describe, expect, it } from "vitest";
import { checkBasicAuth, csrfCheck, safeEqual } from "../security";

describe("safeEqual", () => {
  it("retorna true para strings idênticas", () => {
    expect(safeEqual("hunter2", "hunter2")).toBe(true);
    expect(safeEqual("", "")).toBe(true);
  });

  it("retorna false para strings diferentes de mesmo tamanho", () => {
    expect(safeEqual("hunter2", "hunter3")).toBe(false);
  });

  it("retorna false para tamanhos diferentes", () => {
    expect(safeEqual("a", "aa")).toBe(false);
    expect(safeEqual("hunter2", "hunter23")).toBe(false);
  });
});

function authRequest(value: string | undefined): Request {
  const headers: Record<string, string> = {};
  if (value !== undefined) headers.Authorization = value;
  return new Request("https://example.com", { headers });
}

describe("checkBasicAuth", () => {
  const expected = "correct-horse-battery-staple";

  it("aceita credenciais válidas (qualquer username)", () => {
    const auth = `Basic ${btoa(`anyuser:${expected}`)}`;
    expect(checkBasicAuth(authRequest(auth), expected)).toBe(true);
  });

  it("aceita username vazio", () => {
    const auth = `Basic ${btoa(`:${expected}`)}`;
    expect(checkBasicAuth(authRequest(auth), expected)).toBe(true);
  });

  it("rejeita senha errada", () => {
    const auth = `Basic ${btoa("u:wrong-password")}`;
    expect(checkBasicAuth(authRequest(auth), expected)).toBe(false);
  });

  it("rejeita header ausente", () => {
    expect(checkBasicAuth(authRequest(undefined), expected)).toBe(false);
  });

  it("rejeita esquema diferente de Basic", () => {
    expect(checkBasicAuth(authRequest("Bearer abc"), expected)).toBe(false);
    expect(checkBasicAuth(authRequest("Digest xyz"), expected)).toBe(false);
  });

  it("rejeita base64 malformado", () => {
    expect(checkBasicAuth(authRequest("Basic !@#$%^"), expected)).toBe(false);
  });

  it("rejeita payload sem dois-pontos", () => {
    const auth = `Basic ${btoa("sem-colon-aqui")}`;
    expect(checkBasicAuth(authRequest(auth), expected)).toBe(false);
  });

  it("rejeita senha vazia", () => {
    const auth = `Basic ${btoa("user:")}`;
    expect(checkBasicAuth(authRequest(auth), expected)).toBe(false);
  });
});

function csrfReq(method: string, site: string | undefined): Request {
  const headers: Record<string, string> = {};
  if (site !== undefined) headers["Sec-Fetch-Site"] = site;
  return new Request("https://example.com", { method, headers });
}

describe("csrfCheck", () => {
  it("permite GET independente do Sec-Fetch-Site", () => {
    expect(csrfCheck(csrfReq("GET", "cross-site"))).toBe(true);
    expect(csrfCheck(csrfReq("GET", "same-origin"))).toBe(true);
    expect(csrfCheck(csrfReq("GET", undefined))).toBe(true);
  });

  it("bloqueia POST cross-site", () => {
    expect(csrfCheck(csrfReq("POST", "cross-site"))).toBe(false);
  });

  it("bloqueia DELETE/PUT/PATCH cross-site", () => {
    expect(csrfCheck(csrfReq("DELETE", "cross-site"))).toBe(false);
    expect(csrfCheck(csrfReq("PUT", "cross-site"))).toBe(false);
    expect(csrfCheck(csrfReq("PATCH", "cross-site"))).toBe(false);
  });

  it("permite POST same-origin", () => {
    expect(csrfCheck(csrfReq("POST", "same-origin"))).toBe(true);
  });

  it("permite POST same-site (subdomínios em eTLD+1 separado)", () => {
    expect(csrfCheck(csrfReq("POST", "same-site"))).toBe(true);
  });

  it("permite POST com Sec-Fetch-Site ausente (cliente programático)", () => {
    expect(csrfCheck(csrfReq("POST", undefined))).toBe(true);
  });

  it("permite POST com Sec-Fetch-Site: none", () => {
    expect(csrfCheck(csrfReq("POST", "none"))).toBe(true);
  });
});
