import { describe, expect, it } from "vitest";
import { centsToInput, formatBRL, parseBRL } from "../../src/lib/money";

describe("formatBRL", () => {
  it("formata centavos em reais", () => {
    expect(formatBRL(2590)).toBe("R$ 25,90");
    expect(formatBRL(0)).toBe("R$ 0,00");
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
  });
});

describe("parseBRL", () => {
  it.each([
    ["25,90", 2590],
    ["25.90", 2590],
    ["25", 2500],
    ["R$ 1.025,90", 102590],
    ["1.025", 102500],
    ["0,5", 50],
    [" 7,00 ", 700],
  ])("%s → %i centavos", (input, cents) => {
    expect(parseBRL(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "1,234", "12,3,4", "1e3"])("recusa %s", (input) => {
    expect(parseBRL(input)).toBeNull();
  });

  it("evita erro de ponto flutuante", () => {
    expect(parseBRL("19,99")).toBe(1999);
    expect(parseBRL("0,29")).toBe(29);
  });

  it("volta para o formato do campo", () => {
    expect(centsToInput(2590)).toBe("25,90");
  });
});
