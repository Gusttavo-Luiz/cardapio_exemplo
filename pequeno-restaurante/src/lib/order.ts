import type { DeliveryZone, Settings } from "../data/types";
import { cartSubtotal, lineTotal, type CartLine } from "./cart";
import { formatBRL } from "./money";
import { toWhatsappNumber } from "./text";

export type OrderMode = "pickup" | "delivery";

export const MAX_ADDRESS = 300;
export const MAX_SHORT_FIELD = 80;

export interface CheckoutDetails {
  mode: OrderMode | null;
  address: string;
  reference: string;
  /** id da região escolhida, "other" para região não listada, ou null. */
  zoneId: string | null;
  payment: string | null;
  customerName: string;
}

export const emptyCheckout: CheckoutDetails = {
  mode: null,
  address: "",
  reference: "",
  zoneId: null,
  payment: null,
  customerName: "",
};

/** Modalidades que o cliente pode escolher: só as que o restaurante ativou e confirmou. */
export function availableModes(settings: Settings): OrderMode[] {
  if (!settings.servicesConfirmed) return [];
  const modes: OrderMode[] = [];
  if (settings.pickup) modes.push("pickup");
  if (settings.delivery) modes.push("delivery");
  return modes;
}

export const modeLabel: Record<OrderMode, string> = {
  pickup: "Retirada no restaurante",
  delivery: "Entrega",
};

export function activeZones(zones: DeliveryZone[]): DeliveryZone[] {
  return zones.filter((z) => z.active).sort((a, b) => a.position - b.position);
}

/**
 * Taxa de entrega cadastrada para o pedido, em centavos.
 * null quando não se aplica ou quando não há taxa cadastrada (o restaurante informa depois).
 */
export function deliveryFee(
  settings: Settings,
  zones: DeliveryZone[],
  details: CheckoutDetails,
): number | null {
  if (details.mode !== "delivery") return null;
  if (settings.deliveryFeeMode === "fixed") return settings.deliveryFeeCents;
  if (settings.deliveryFeeMode === "zones") {
    const zone = activeZones(zones).find((z) => z.id === details.zoneId);
    return zone ? zone.feeCents : null;
  }
  return null;
}

export interface OrderTotals {
  subtotalCents: number;
  feeCents: number | null;
  totalCents: number;
}

export function orderTotals(
  lines: CartLine[],
  settings: Settings,
  zones: DeliveryZone[],
  details: CheckoutDetails,
): OrderTotals {
  const subtotalCents = cartSubtotal(lines);
  const feeCents = deliveryFee(settings, zones, details);
  return { subtotalCents, feeCents, totalCents: subtotalCents + (feeCents ?? 0) };
}

/** Remove quebras de linha e caracteres de controle de textos digitados pelo cliente. */
export function cleanText(text: string, max: number): string {
  return text
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Lista de problemas que impedem a finalização. Vazia quando o pedido pode ser enviado. */
export function validateCheckout(
  lines: CartLine[],
  settings: Settings,
  zones: DeliveryZone[],
  details: CheckoutDetails,
): string[] {
  const errors: string[] = [];
  if (lines.length === 0) errors.push("Adicione pelo menos um item ao pedido.");
  const modes = availableModes(settings);
  if (modes.length > 1 && !details.mode) errors.push("Escolha entre entrega e retirada.");
  if (details.mode && !modes.includes(details.mode)) errors.push("Essa modalidade não está disponível.");
  if (details.mode === "delivery") {
    if (cleanText(details.address, MAX_ADDRESS).length < 8) {
      errors.push("Informe o endereço de entrega com rua, número e bairro.");
    }
    if (settings.deliveryFeeMode === "zones" && activeZones(zones).length > 0 && !details.zoneId) {
      errors.push("Escolha a região de entrega.");
    }
  }
  return errors;
}

export function lineLabel(line: CartLine): string {
  return line.optionLabel ? `${line.name} (${line.optionLabel})` : line.name;
}

export function buildOrderMessage(
  lines: CartLine[],
  settings: Settings,
  zones: DeliveryZone[],
  details: CheckoutDetails,
): string {
  const { subtotalCents, feeCents, totalCents } = orderTotals(lines, settings, zones, details);
  const out: string[] = [];
  out.push(`Olá! Gostaria de fazer um pedido no ${settings.restaurantName}.`, "", "ITENS:");
  for (const line of lines) {
    const name = lineLabel(line);
    const each = line.quantity > 1 ? ` (${formatBRL(line.unitPriceCents)} cada)` : "";
    out.push(`• ${line.quantity} × ${name} — ${formatBRL(lineTotal(line))}${each}`);
  }

  const notes = lines.filter((l) => cleanText(l.notes, 200));
  out.push("", "Observações:");
  if (notes.length === 0) out.push("Nenhuma");
  for (const line of notes) out.push(`• ${lineLabel(line)}: ${cleanText(line.notes, 200)}`);

  out.push("", `Subtotal: ${formatBRL(subtotalCents)}`);
  if (details.mode) out.push(`Entrega ou retirada: ${modeLabel[details.mode]}`);
  if (details.mode === "delivery") {
    out.push(`Endereço de entrega: ${cleanText(details.address, MAX_ADDRESS)}`);
    const reference = cleanText(details.reference, MAX_SHORT_FIELD);
    if (reference) out.push(`Ponto de referência: ${reference}`);
    if (settings.deliveryFeeMode === "zones" && details.zoneId) {
      const zone = activeZones(zones).find((z) => z.id === details.zoneId);
      out.push(`Região: ${zone ? zone.name : "Outra (não listada)"}`);
    }
    out.push(
      feeCents === null
        ? "Taxa de entrega: a ser informada pelo restaurante"
        : `Taxa de entrega: ${formatBRL(feeCents)}`,
    );
  }
  const payment = details.payment ? cleanText(details.payment, MAX_SHORT_FIELD) : "";
  if (payment) out.push(`Forma de pagamento: ${payment}`);
  const customerName = cleanText(details.customerName, MAX_SHORT_FIELD);
  if (customerName) out.push(`Nome para o pedido: ${customerName}`);
  const pendingFee = details.mode === "delivery" && feeCents === null;
  out.push(`${pendingFee ? "Total (sem a taxa de entrega)" : "Total"}: ${formatBRL(totalCents)}`);
  out.push("", "Aguardo a confirmação do restaurante. Obrigado!");
  return out.join("\n");
}

/** Link do WhatsApp com a mensagem codificada, ou null se o número não estiver válido e confirmado. */
export function whatsappLink(settings: Settings, message: string): string | null {
  if (!settings.whatsappConfirmed) return null;
  const number = toWhatsappNumber(settings.whatsapp);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
