import type { MenuData } from "../data/types";

export interface PendingItem {
  id: string;
  text: string;
  tab: "pratos" | "restaurante" | "entrega";
  /** "required": precisa ser resolvido antes de divulgar; "recommended": melhora o cardápio. */
  level: "required" | "recommended";
}

/** Lista o que ainda depende de confirmação do proprietário antes de divulgar o cardápio. */
export function pendingItems({ settings: s, products }: MenuData): PendingItem[] {
  const items: PendingItem[] = [];
  const published = products.filter((p) => p.published);
  const add = (id: string, text: string, tab: PendingItem["tab"], level: PendingItem["level"] = "required") =>
    items.push({ id, text, tab, level });

  if (published.length === 0) add("pratos", "Cadastre e publique os pratos reais, com preços confirmados.", "pratos");
  const placeholderImages = published.filter((p) => !p.imageUrl || p.imageIsPlaceholder).length;
  if (placeholderImages > 0) {
    add("fotos", `${placeholderImages} prato(s) publicado(s) sem foto real autorizada.`, "pratos", "recommended");
  }
  if (!s.heroImageUrl || s.heroImageIsPlaceholder) add("capa", "Envie uma foto real e autorizada para a capa.", "restaurante", "recommended");
  if (!s.addressConfirmed) add("endereco", "Confirme o endereço completo.", "restaurante");
  if (!s.phoneConfirmed) add("telefone", "Confirme o telefone de contato.", "restaurante");
  if (!s.whatsappConfirmed) {
    add("whatsapp", "Confirme se o número recebe pedidos pelo WhatsApp (o envio de pedidos fica desativado até lá).", "restaurante");
  }
  if (!s.instagramConfirmed) add("instagram", "Confirme o perfil oficial do Instagram.", "restaurante");
  if (!s.hoursConfirmed) add("horario", "Confirme os dias e horários de funcionamento.", "restaurante");
  if (!s.servicesConfirmed) {
    add("atendimento", "Confirme as modalidades de atendimento (consumo no local, retirada, entrega).", "restaurante");
  }
  if (!s.paymentsConfirmed || s.paymentMethods.length === 0) add("pagamento", "Informe e confirme as formas de pagamento aceitas.", "restaurante");
  if (s.delivery && s.deliveryFeeMode === "none") {
    add("taxa", "Se houver taxa de entrega, cadastre-a. Sem taxa cadastrada, o cliente vê “a informar pelo restaurante”.", "entrega", "recommended");
  }
  if (!s.privacyController || !s.privacyContact) {
    add("privacidade", "Informe o responsável pelos dados e um contato para a política de privacidade.", "restaurante");
  }
  return items;
}
