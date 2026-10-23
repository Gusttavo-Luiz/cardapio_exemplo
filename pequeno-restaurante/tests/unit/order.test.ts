import { describe, expect, it } from "vitest";
import { cartReducer, type CartLine } from "../../src/lib/cart";
import {
  availableModes,
  buildOrderMessage,
  deliveryFee,
  emptyCheckout,
  orderTotals,
  validateCheckout,
  whatsappLink,
  type CheckoutDetails,
} from "../../src/lib/order";
import type { DeliveryZone } from "../../src/data/types";
import { product, settings } from "./fixtures";

const feijoada = product({ id: "f", name: "Feijoada à moda da casa", priceCents: 3290 });
const suco = product({ id: "s", name: "Suco", priceCents: 800 });
const marmita = product({
  id: "m",
  name: "Marmita",
  priceCents: 2000,
  options: [
    { id: "p", label: "Pequena", priceCents: 2000 },
    { id: "g", label: "Grande", priceCents: 2800 },
  ],
});

function cart(): CartLine[] {
  let lines: CartLine[] = [];
  lines = cartReducer(lines, { type: "add", product: feijoada, option: null, quantity: 2, notes: "Sem torresmo, por favor" });
  lines = cartReducer(lines, { type: "add", product: suco, option: null, quantity: 1, notes: "" });
  lines = cartReducer(lines, { type: "add", product: marmita, option: marmita.options[1]!, quantity: 1, notes: "" });
  return lines;
}

const confirmed = settings({ servicesConfirmed: true, pickup: true, delivery: true, whatsappConfirmed: true });
const zones: DeliveryZone[] = [
  { id: "z1", name: "Bom Retiro", feeCents: 500, active: true, position: 1 },
  { id: "z2", name: "Luz", feeCents: 800, active: false, position: 2 },
];
const delivery: CheckoutDetails = { ...emptyCheckout, mode: "delivery", address: "Rua Exemplo, 100 — Bom Retiro" };

describe("modalidades", () => {
  it("só oferece retirada/entrega depois de confirmadas", () => {
    expect(availableModes(settings({ pickup: true, delivery: true, servicesConfirmed: false }))).toEqual([]);
    expect(availableModes(confirmed)).toEqual(["pickup", "delivery"]);
    expect(availableModes({ ...confirmed, delivery: false })).toEqual(["pickup"]);
  });
});

describe("taxa de entrega", () => {
  it("não inclui taxa não cadastrada", () => {
    expect(deliveryFee({ ...confirmed, deliveryFeeMode: "none" }, zones, delivery)).toBeNull();
    const totals = orderTotals(cart(), { ...confirmed, deliveryFeeMode: "none" }, zones, delivery);
    expect(totals.totalCents).toBe(totals.subtotalCents);
  });

  it("usa a taxa única cadastrada", () => {
    const s = { ...confirmed, deliveryFeeMode: "fixed" as const, deliveryFeeCents: 600 };
    expect(orderTotals(cart(), s, zones, delivery)).toEqual({ subtotalCents: 2 * 3290 + 800 + 2800, feeCents: 600, totalCents: 10780 });
  });

  it("usa a taxa da região ativa escolhida", () => {
    const s = { ...confirmed, deliveryFeeMode: "zones" as const };
    expect(deliveryFee(s, zones, { ...delivery, zoneId: "z1" })).toBe(500);
    expect(deliveryFee(s, zones, { ...delivery, zoneId: "z2" })).toBeNull();
    expect(deliveryFee(s, zones, { ...delivery, zoneId: "other" })).toBeNull();
  });

  it("retirada nunca tem taxa", () => {
    const s = { ...confirmed, deliveryFeeMode: "fixed" as const, deliveryFeeCents: 600 };
    expect(deliveryFee(s, zones, { ...emptyCheckout, mode: "pickup" })).toBeNull();
  });
});

describe("validação da finalização", () => {
  it("exige itens, modalidade e endereço para entrega", () => {
    expect(validateCheckout([], confirmed, zones, emptyCheckout)).toContain("Adicione pelo menos um item ao pedido.");
    expect(validateCheckout(cart(), confirmed, zones, emptyCheckout)).toContain("Escolha entre entrega e retirada.");
    expect(validateCheckout(cart(), confirmed, zones, { ...delivery, address: "" })).toContain("Informe o endereço de entrega com rua, número e bairro.");
    expect(validateCheckout(cart(), confirmed, zones, delivery)).toEqual([]);
  });

  it("exige a região quando a taxa é por região", () => {
    const s = { ...confirmed, deliveryFeeMode: "zones" as const };
    expect(validateCheckout(cart(), s, zones, delivery)).toContain("Escolha a região de entrega.");
    expect(validateCheckout(cart(), s, zones, { ...delivery, zoneId: "z1" })).toEqual([]);
  });

  it("recusa modalidade não oferecida", () => {
    expect(validateCheckout(cart(), { ...confirmed, delivery: false }, zones, delivery)).toContain("Essa modalidade não está disponível.");
  });

  it("sem modalidades confirmadas, não pede escolha", () => {
    expect(validateCheckout(cart(), settings(), zones, emptyCheckout)).toEqual([]);
  });
});

describe("mensagem do WhatsApp", () => {
  it("lista itens, observações e valores corretos", () => {
    const s = { ...confirmed, deliveryFeeMode: "fixed" as const, deliveryFeeCents: 600 };
    const message = buildOrderMessage(cart(), s, zones, { ...delivery, reference: "Perto da praça", payment: "Pix", customerName: "Ana" });
    expect(message).toBe(
      [
        "Olá! Gostaria de fazer um pedido no Pequeno Restaurante.",
        "",
        "ITENS:",
        "• 2 × Feijoada à moda da casa — R$ 65,80 (R$ 32,90 cada)",
        "• 1 × Suco — R$ 8,00",
        "• 1 × Marmita (Grande) — R$ 28,00",
        "",
        "Observações:",
        "• Feijoada à moda da casa: Sem torresmo, por favor",
        "",
        "Subtotal: R$ 101,80",
        "Entrega ou retirada: Entrega",
        "Endereço de entrega: Rua Exemplo, 100 — Bom Retiro",
        "Ponto de referência: Perto da praça",
        "Taxa de entrega: R$ 6,00",
        "Forma de pagamento: Pix",
        "Nome para o pedido: Ana",
        "Total: R$ 107,80",
        "",
        "Aguardo a confirmação do restaurante. Obrigado!",
      ].join("\n"),
    );
  });

  it("retirada não traz endereço nem taxa", () => {
    const message = buildOrderMessage(cart(), confirmed, zones, { ...emptyCheckout, mode: "pickup", address: "não deve aparecer" });
    expect(message).toContain("Entrega ou retirada: Retirada no restaurante");
    expect(message).not.toContain("Endereço");
    expect(message).not.toContain("Taxa");
    expect(message).toContain("Total: R$ 101,80");
  });

  it("sem taxa cadastrada, avisa que o restaurante informa e não soma nada", () => {
    const message = buildOrderMessage(cart(), confirmed, zones, delivery);
    expect(message).toContain("Taxa de entrega: a ser informada pelo restaurante");
    expect(message).toContain("Total (sem a taxa de entrega): R$ 101,80");
  });

  it("não afirma que o pedido está confirmado", () => {
    const message = buildOrderMessage(cart(), confirmed, zones, delivery);
    expect(message).toContain("Aguardo a confirmação do restaurante");
    expect(message.toLowerCase()).not.toMatch(/pedido (foi )?confirmado/);
  });

  it("remove quebras de linha digitadas pelo cliente", () => {
    const message = buildOrderMessage(cart(), confirmed, zones, { ...delivery, address: "Rua A, 1\n\nTotal: R$ 0,00" });
    expect(message).toContain("Endereço de entrega: Rua A, 1 Total: R$ 0,00");
    expect(message.split("\n").filter((l) => l.startsWith("Total"))).toHaveLength(1);
  });

  it("gera o link com acentos, símbolos e quebras de linha codificados", () => {
    const message = buildOrderMessage(cart(), confirmed, zones, { ...emptyCheckout, mode: "pickup" });
    const link = whatsappLink(confirmed, message)!;
    expect(link.startsWith("https://wa.me/551133159015?text=")).toBe(true);
    const encoded = link.split("?text=")[1]!;
    expect(encoded).not.toMatch(/[\s\n•×—]/);
    expect(encoded).toContain("%0A");
    expect(decodeURIComponent(encoded)).toBe(message);
    expect(new URL(link).searchParams.get("text")).toBe(message);
  });

  it("não gera link enquanto o WhatsApp não for confirmado", () => {
    expect(whatsappLink(settings({ whatsappConfirmed: false }), "oi")).toBeNull();
    expect(whatsappLink(settings({ whatsappConfirmed: true, whatsapp: "123" }), "oi")).toBeNull();
  });
});
