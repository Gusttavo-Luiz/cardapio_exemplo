const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 2590 → "R$ 25,90" (com espaço comum, para a mensagem do WhatsApp ficar legível). */
export function formatBRL(cents: number): string {
  return formatter.format(cents / 100).replace(/\s/g, " ");
}

/**
 * Converte o que o administrador digita ("25,90", "25.90", "R$ 1.025,90") em centavos.
 * Retorna null quando o texto não é um valor válido.
 */
export function parseBRL(input: string): number | null {
  let text = input.replace(/R\$|\s/g, "");
  if (!text) return null;
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  return Math.round(Number(text) * 100);
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
