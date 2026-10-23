import { describe, expect, it } from "vitest";
import {
  blockingIssues,
  CART_TTL_MS,
  cartCount,
  cartReducer,
  cartSubtotal,
  loadCart,
  MAX_QUANTITY,
  reconcileCart,
  saveCart,
  type CartLine,
} from "../../src/lib/cart";
import { product } from "./fixtures";

const sizes = product({
  id: "p2",
  name: "Marmita",
  priceCents: 2000,
  options: [
    { id: "p", label: "P", priceCents: 2000 },
    { id: "g", label: "G", priceCents: 3500 },
  ],
});

function add(lines: CartLine[], p = product(), quantity = 1, notes = "", optionId?: string) {
  const option = optionId ? p.options.find((o) => o.id === optionId)! : null;
  return cartReducer(lines, { type: "add", product: p, option, quantity, notes });
}

describe("carrinho", () => {
  it("soma quantidades, subtotais e total", () => {
    let lines = add([], product(), 2);
    lines = add(lines, sizes, 1, "", "g");
    expect(cartCount(lines)).toBe(3);
    expect(cartSubtotal(lines)).toBe(2 * 2500 + 3500);
  });

  it("junta o mesmo prato com a mesma observação numa só linha", () => {
    let lines = add([], product(), 1);
    lines = add(lines, product(), 2);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.quantity).toBe(3);
  });

  it("separa linhas com variações ou observações diferentes", () => {
    let lines = add([], sizes, 1, "", "p");
    lines = add(lines, sizes, 1, "", "g");
    lines = add(lines, sizes, 1, "sem cebola", "g");
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.unitPriceCents)).toEqual([2000, 3500, 3500]);
  });

  it("não adiciona prato indisponível", () => {
    expect(add([], product({ available: false }))).toEqual([]);
  });

  it("exige escolher a variação quando o prato tem variações", () => {
    expect(add([], sizes)).toEqual([]);
  });

  it("aumenta, diminui e remove itens", () => {
    let lines = add([], product(), 1);
    const id = lines[0]!.id;
    lines = cartReducer(lines, { type: "setQuantity", lineId: id, quantity: 4 });
    expect(lines[0]!.quantity).toBe(4);
    lines = cartReducer(lines, { type: "setQuantity", lineId: id, quantity: 0 });
    expect(lines).toEqual([]);
    lines = add([], product(), 1);
    lines = cartReducer(lines, { type: "remove", lineId: lines[0]!.id });
    expect(lines).toEqual([]);
  });

  it("limita a quantidade máxima", () => {
    const lines = add([], product(), 500);
    expect(lines[0]!.quantity).toBe(MAX_QUANTITY);
  });

  it("limpa o carrinho", () => {
    expect(cartReducer(add([], product()), { type: "clear" })).toEqual([]);
  });
});

describe("conferência com o cardápio atual", () => {
  it("atualiza preços e avisa a mudança", () => {
    const lines = add([], product(), 2);
    const { lines: updated, issues } = reconcileCart(lines, [product({ priceCents: 2790 })]);
    expect(updated[0]!.unitPriceCents).toBe(2790);
    expect(issues).toEqual([{ kind: "priceChanged", lineId: lines[0]!.id, name: "Prato A", fromCents: 2500, toCents: 2790 }]);
    expect(blockingIssues(issues)).toEqual([]);
  });

  it("bloqueia itens que ficaram indisponíveis ou saíram do cardápio", () => {
    let lines = add([], product(), 1);
    lines = add(lines, sizes, 1, "", "g");
    const { issues } = reconcileCart(lines, [product({ available: false })]);
    expect(issues.map((i) => i.kind)).toEqual(["unavailable", "missing"]);
    expect(blockingIssues(issues)).toHaveLength(2);
  });

  it("bloqueia variação removida e prato despublicado", () => {
    const lines = add([], sizes, 1, "", "g");
    const withoutG = { ...sizes, options: sizes.options.filter((o) => o.id !== "g") };
    expect(reconcileCart(lines, [withoutG]).issues[0]!.kind).toBe("missing");
    expect(reconcileCart(lines, [{ ...sizes, published: false }]).issues[0]!.kind).toBe("missing");
  });
});

describe("carrinho salvo no navegador", () => {
  function memoryStorage(): Storage {
    const data = new Map<string, string>();
    return {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
      clear: () => data.clear(),
      key: () => null,
      get length() {
        return data.size;
      },
    };
  }

  it("recupera o carrinho depois de atualizar a página", () => {
    const storage = memoryStorage();
    const lines = add([], product(), 2, "bem passado");
    saveCart(storage, lines, 1000);
    expect(loadCart(storage, 2000)).toEqual(lines);
  });

  it("descarta carrinho expirado ou corrompido", () => {
    const storage = memoryStorage();
    saveCart(storage, add([], product()), 0);
    expect(loadCart(storage, CART_TTL_MS + 1)).toEqual([]);
    storage.setItem("pequeno-restaurante:carrinho", "{não é json");
    expect(loadCart(storage)).toEqual([]);
    storage.setItem("pequeno-restaurante:carrinho", JSON.stringify({ v: 1, savedAt: Date.now(), lines: [{ quantity: -3 }] }));
    expect(loadCart(storage)).toEqual([]);
  });

  it("funciona sem armazenamento disponível", () => {
    expect(loadCart(undefined)).toEqual([]);
    expect(() => saveCart(undefined, [])).not.toThrow();
  });
});
