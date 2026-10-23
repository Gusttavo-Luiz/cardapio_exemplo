import type { Product, ProductOption } from "../data/types";

export const MAX_QUANTITY = 99;
export const MAX_NOTES = 200;
/** O carrinho salvo no navegador expira depois deste tempo. */
export const CART_TTL_MS = 12 * 60 * 60 * 1000;
const STORAGE_KEY = "pequeno-restaurante:carrinho";

export interface CartLine {
  id: string;
  productId: string;
  optionId: string | null;
  /** Cópia do nome e do preço no momento em que o item foi adicionado; atualizada a cada carga do cardápio. */
  name: string;
  optionLabel: string | null;
  unitPriceCents: number;
  quantity: number;
  notes: string;
}

export type CartAction =
  | { type: "add"; product: Product; option: ProductOption | null; quantity: number; notes: string }
  | { type: "setQuantity"; lineId: string; quantity: number }
  | { type: "setNotes"; lineId: string; notes: string }
  | { type: "remove"; lineId: string }
  | { type: "replace"; lines: CartLine[] }
  | { type: "clear" };

function clampQuantity(n: number): number {
  return Math.min(MAX_QUANTITY, Math.max(0, Math.floor(n)));
}

function cleanNotes(notes: string): string {
  return notes.replace(/\s+/g, " ").trim().slice(0, MAX_NOTES);
}

let counter = 0;
function newLineId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "add": {
      const { product, option } = action;
      const quantity = clampQuantity(action.quantity);
      if (quantity === 0 || !product.available) return lines;
      if (product.options.length > 0 && !option) return lines;
      const notes = cleanNotes(action.notes);
      const optionId = option?.id ?? null;
      const same = lines.find(
        (l) => l.productId === product.id && l.optionId === optionId && l.notes === notes,
      );
      if (same) {
        return lines.map((l) =>
          l === same ? { ...l, quantity: clampQuantity(l.quantity + quantity) } : l,
        );
      }
      return [
        ...lines,
        {
          id: newLineId(),
          productId: product.id,
          optionId,
          name: product.name,
          optionLabel: option?.label ?? null,
          unitPriceCents: option ? option.priceCents : product.priceCents,
          quantity,
          notes,
        },
      ];
    }
    case "setQuantity": {
      const quantity = clampQuantity(action.quantity);
      if (quantity === 0) return lines.filter((l) => l.id !== action.lineId);
      return lines.map((l) => (l.id === action.lineId ? { ...l, quantity } : l));
    }
    case "setNotes":
      return lines.map((l) =>
        l.id === action.lineId ? { ...l, notes: action.notes.slice(0, MAX_NOTES) } : l,
      );
    case "remove":
      return lines.filter((l) => l.id !== action.lineId);
    case "replace":
      return action.lines;
    case "clear":
      return [];
  }
}

export function lineTotal(line: CartLine): number {
  return line.unitPriceCents * line.quantity;
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export type LineIssue =
  | { kind: "missing"; lineId: string; name: string }
  | { kind: "unavailable"; lineId: string; name: string }
  | { kind: "priceChanged"; lineId: string; name: string; fromCents: number; toCents: number };

/**
 * Compara o carrinho com o cardápio atual: atualiza nomes e preços e aponta itens que saíram
 * do cardápio ou ficaram indisponíveis. Itens com problema continuam no carrinho para o
 * cliente decidir, mas não podem ser enviados.
 */
export function reconcileCart(
  lines: CartLine[],
  products: Product[],
): { lines: CartLine[]; issues: LineIssue[] } {
  const byId = new Map(products.map((p) => [p.id, p]));
  const issues: LineIssue[] = [];
  const updated = lines.map((line) => {
    const product = byId.get(line.productId);
    const option = line.optionId
      ? product?.options.find((o) => o.id === line.optionId)
      : null;
    const label = line.optionLabel ? `${line.name} (${line.optionLabel})` : line.name;
    if (!product || !product.published || (line.optionId && !option) || (!line.optionId && product.options.length > 0)) {
      issues.push({ kind: "missing", lineId: line.id, name: label });
      return line;
    }
    const price = option ? option.priceCents : product.priceCents;
    const next: CartLine = {
      ...line,
      name: product.name,
      optionLabel: option?.label ?? null,
      unitPriceCents: price,
    };
    if (!product.available) {
      issues.push({ kind: "unavailable", lineId: line.id, name: label });
    } else if (price !== line.unitPriceCents) {
      issues.push({
        kind: "priceChanged",
        lineId: line.id,
        name: label,
        fromCents: line.unitPriceCents,
        toCents: price,
      });
    }
    return next;
  });
  return { lines: updated, issues };
}

export function blockingIssues(issues: LineIssue[]): LineIssue[] {
  return issues.filter((i) => i.kind !== "priceChanged");
}

// Validação manual do que vem do navegador (sem biblioteca, para manter o cardápio leve).
const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function isCartLine(v: unknown): v is CartLine {
  if (!v || typeof v !== "object") return false;
  const l = v as Record<string, unknown>;
  return (
    isText(l.id, 80) &&
    isText(l.productId, 80) &&
    (l.optionId === null || isText(l.optionId, 80)) &&
    isText(l.name, 200) &&
    (l.optionLabel === null || isText(l.optionLabel, 200)) &&
    isInt(l.unitPriceCents, 0, 10_000_000) &&
    isInt(l.quantity, 1, MAX_QUANTITY) &&
    isText(l.notes, MAX_NOTES)
  );
}

export function loadCart(storage: Storage | undefined, now = Date.now()): CartLine[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as { v?: unknown; savedAt?: unknown; lines?: unknown };
    const valid =
      data?.v === 1 &&
      typeof data.savedAt === "number" &&
      now - data.savedAt <= CART_TTL_MS &&
      Array.isArray(data.lines) &&
      data.lines.length <= 100 &&
      data.lines.every(isCartLine);
    if (!valid) {
      storage?.removeItem(STORAGE_KEY);
      return [];
    }
    return data.lines as CartLine[];
  } catch {
    return [];
  }
}

export function saveCart(storage: Storage | undefined, lines: CartLine[], now = Date.now()): void {
  try {
    if (lines.length === 0) storage?.removeItem(STORAGE_KEY);
    else storage?.setItem(STORAGE_KEY, JSON.stringify({ v: 1, savedAt: now, lines }));
  } catch {
    // Navegação privada ou armazenamento cheio: o carrinho continua funcionando só na memória.
  }
}
