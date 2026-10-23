import { referenceSettings } from "../../src/data/demoData";
import type { Product, Settings } from "../../src/data/types";

export function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    categoryId: "c1",
    name: "Prato A",
    description: "",
    priceCents: 2500,
    options: [],
    imageUrl: null,
    imageIsPlaceholder: false,
    available: true,
    published: true,
    position: 0,
    ...overrides,
  };
}

export function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...referenceSettings, ...overrides };
}
