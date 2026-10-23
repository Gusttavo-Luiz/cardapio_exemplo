import { describe, expect, it } from "vitest";
import { instagramHandle, matchesSearch, slugify, toWhatsappNumber } from "../../src/lib/text";

describe("busca", () => {
  it("ignora acentos e maiúsculas", () => {
    expect(matchesSearch("feijao", "Feijão tropeiro")).toBe(true);
    expect(matchesSearch("FRANGO", "Filé de frango")).toBe(true);
  });
  it("procura no nome e na descrição, exigindo todos os termos", () => {
    expect(matchesSearch("arroz frango", "Prato executivo", "Frango grelhado com arroz")).toBe(true);
    expect(matchesSearch("arroz peixe", "Prato executivo", "Frango grelhado com arroz")).toBe(false);
  });
  it("busca vazia mostra tudo", () => {
    expect(matchesSearch("  ", "Qualquer")).toBe(true);
  });
});

describe("slugify", () => {
  it("gera endereço legível", () => {
    expect(slugify("Carnes e Aves")).toBe("carnes-e-aves");
    expect(slugify("  Pratos do dia! ")).toBe("pratos-do-dia");
    expect(slugify("Sobremesas & Doces")).toBe("sobremesas-doces");
  });
});

describe("toWhatsappNumber", () => {
  it("adiciona o código do Brasil", () => {
    expect(toWhatsappNumber("(11) 3315-9015")).toBe("551133159015");
    expect(toWhatsappNumber("11 99999-8888")).toBe("5511999998888");
    expect(toWhatsappNumber("+55 11 3315-9015")).toBe("551133159015");
  });
  it("recusa números incompletos", () => {
    expect(toWhatsappNumber("3315-9015")).toBeNull();
    expect(toWhatsappNumber("")).toBeNull();
    expect(toWhatsappNumber("+1 415 555 1234")).toBeNull();
  });
});

describe("instagramHandle", () => {
  it("aceita usuário, @usuário ou link", () => {
    expect(instagramHandle("pequeno_restaurante")).toBe("pequeno_restaurante");
    expect(instagramHandle("@pequeno_restaurante")).toBe("pequeno_restaurante");
    expect(instagramHandle("https://www.instagram.com/pequeno_restaurante/")).toBe("pequeno_restaurante");
  });
});
