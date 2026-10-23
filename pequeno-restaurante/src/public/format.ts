import type { Product } from "../data/types";
import { formatBRL } from "../lib/money";

/** Preço exibido no cartão: o da variação mais barata quando houver variações. */
export function priceLabel(product: Product): string {
  if (product.options.length === 0) return formatBRL(product.priceCents);
  const min = Math.min(...product.options.map((o) => o.priceCents));
  const allSame = product.options.every((o) => o.priceCents === min);
  return allSame ? formatBRL(min) : `a partir de ${formatBRL(min)}`;
}

export function pluralItems(n: number): string {
  return n === 1 ? "1 item" : `${n} itens`;
}
