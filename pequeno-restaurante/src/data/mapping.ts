import type { Category, DeliveryZone, MenuData, Product, Settings } from "./types";

// Conversão entre as colunas do banco (snake_case) e os objetos do site (camelCase).

export type Row = Record<string, unknown>;

export function toSnake(obj: object): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase())] = value;
  }
  return out;
}

export function toCamel<T>(row: Row): T {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "created_at" || key === "updated_at") continue;
    out[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
  }
  return out as T;
}

export function mapProduct(row: Row): Product {
  const p = toCamel<Product>(row);
  return { ...p, options: Array.isArray(p.options) ? p.options : [] };
}

export function mapSettings(row: Row): Settings {
  const s = toCamel<Settings & { id?: number }>(row);
  delete s.id;
  return { ...s, hours: Array.isArray(s.hours) ? s.hours : [], paymentMethods: s.paymentMethods ?? [] };
}

export function mapMenu(settings: Row, categories: Row[], products: Row[], zones: Row[]): MenuData {
  return {
    settings: mapSettings(settings),
    categories: categories.map((r) => toCamel<Category>(r)),
    products: products.map(mapProduct),
    deliveryZones: zones.map((r) => toCamel<DeliveryZone>(r)),
  };
}
