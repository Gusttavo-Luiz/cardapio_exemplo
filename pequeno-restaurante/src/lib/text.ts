/** Minúsculas e sem acentos, para a busca achar "feijao" em "Feijão". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function slugify(text: string): string {
  return normalize(text).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function matchesSearch(query: string, ...fields: string[]): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize(fields.join(" "));
  return terms.every((term) => haystack.includes(term));
}

/** Mantém só dígitos. "(11) 3315-9015" → "1133159015". */
export function digits(text: string): string {
  return text.replace(/\D/g, "");
}

/** Converte um telefone brasileiro em número internacional para o wa.me. Retorna null se inválido. */
export function toWhatsappNumber(input: string): string | null {
  let d = digits(input);
  // Sem "+", 10 ou 11 dígitos são DDD + número; com "+", o código do país já veio junto.
  if (!input.trim().startsWith("+") && (d.length === 10 || d.length === 11)) d = "55" + d;
  return /^55[1-9]\d\d{8,9}$/.test(d) ? d : null;
}

export function instagramHandle(input: string): string {
  return input.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
}
