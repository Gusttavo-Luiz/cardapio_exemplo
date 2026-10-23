// Tipos compartilhados pelo cardápio público, pelo carrinho e pelo painel.
// Valores em dinheiro são sempre inteiros em centavos para evitar erros de arredondamento.

export interface ProductOption {
  id: string;
  label: string;
  priceCents: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  position: number;
  active: boolean;
}

export interface Product {
  id: string;
  categoryId: string | null;
  name: string;
  description: string;
  priceCents: number;
  /** Variações ou tamanhos. Quando houver, o cliente escolhe uma e o preço é o da variação. */
  options: ProductOption[];
  imageUrl: string | null;
  /** Imagem provisória ou ilustrativa: o cardápio avisa que não é foto real do prato. */
  imageIsPlaceholder: boolean;
  available: boolean;
  published: boolean;
  position: number;
}

export interface OpeningHours {
  /** Dias da semana: 0 = domingo … 6 = sábado. */
  days: number[];
  opens: string;
  closes: string;
}

export interface Settings {
  restaurantName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string | null;
  heroImageIsPlaceholder: boolean;

  addressLine: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  mapsUrl: string;
  addressConfirmed: boolean;

  phone: string;
  phoneConfirmed: boolean;
  /** Número com DDI e DDD, só dígitos (ex.: 551133159015). */
  whatsapp: string;
  /** O WhatsApp só recebe pedidos quando o proprietário confirmar o número. */
  whatsappConfirmed: boolean;
  instagram: string;
  instagramConfirmed: boolean;

  hours: OpeningHours[];
  hoursNote: string;
  hoursConfirmed: boolean;

  dineIn: boolean;
  pickup: boolean;
  delivery: boolean;
  servicesConfirmed: boolean;

  paymentMethods: string[];
  paymentsConfirmed: boolean;

  deliveryFeeMode: DeliveryFeeMode;
  deliveryFeeCents: number;
  deliveryNote: string;

  dailyProductId: string | null;

  privacyController: string;
  privacyContact: string;
}

/** none: nenhuma taxa cadastrada; fixed: taxa única; zones: taxa por região. */
export type DeliveryFeeMode = "none" | "fixed" | "zones";

export interface DeliveryZone {
  id: string;
  name: string;
  feeCents: number;
  active: boolean;
  position: number;
}

export interface MenuData {
  settings: Settings;
  categories: Category[];
  products: Product[];
  deliveryZones: DeliveryZone[];
}
