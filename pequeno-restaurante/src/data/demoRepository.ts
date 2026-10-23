import type { AdminRepository, AdminSession, CategoryInput, ProductInput, ZoneInput } from "./repository";
import type { Category, DeliveryZone, MenuData, Product, Settings } from "./types";
import { demoMenu } from "./demoData";

// Repositório de demonstração: usado quando o site não está ligado ao Supabase.
// O cardápio público só lê. O painel de demonstração existe apenas no servidor de
// desenvolvimento (npm run dev) e grava no navegador de quem está testando.

const STORAGE_KEY = "pequeno-restaurante:demo";

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export class DemoRepository implements AdminRepository {
  readonly mode = "demo" as const;

  private read(): MenuData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as MenuData;
    } catch {
      // Sem armazenamento disponível: usa os dados de exemplo.
    }
    return clone(demoMenu);
  }

  private write(data: MenuData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      throw new Error("Não foi possível salvar neste navegador.");
    }
  }

  async loadMenu(options: { includeUnpublished?: boolean } = {}): Promise<MenuData> {
    const data = this.read();
    const products = options.includeUnpublished ? data.products : data.products.filter((p) => p.published);
    return delay({
      ...data,
      categories: [...data.categories].sort((a, b) => a.position - b.position),
      products: [...products].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    });
  }

  async openPreview(): Promise<DemoRepository> {
    return this;
  }

  async getSession(): Promise<AdminSession | null> {
    return { email: "demonstracao@localhost", isAdmin: true };
  }

  onSessionChange(): () => void {
    return () => {};
  }

  async signIn(): Promise<void> {}
  async signOut(): Promise<void> {}
  async requestPasswordReset(): Promise<void> {}
  async updatePassword(): Promise<void> {}

  async saveProduct(id: string | null, input: ProductInput): Promise<Product> {
    const data = this.read();
    const product: Product = { ...input, id: id ?? newId("prato") };
    data.products = id ? data.products.map((p) => (p.id === id ? product : p)) : [...data.products, product];
    this.write(data);
    return delay(product, 100);
  }

  async updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
    const data = this.read();
    data.products = data.products.map((p) => (p.id === id ? { ...p, ...patch } : p));
    this.write(data);
    await delay(null, 100);
  }

  async deleteProduct(id: string): Promise<void> {
    const data = this.read();
    data.products = data.products.filter((p) => p.id !== id);
    if (data.settings.dailyProductId === id) data.settings.dailyProductId = null;
    this.write(data);
  }

  async saveCategory(id: string | null, input: CategoryInput): Promise<Category> {
    const data = this.read();
    if (data.categories.some((c) => c.slug === input.slug && c.id !== id)) {
      throw new Error("Já existe uma categoria com esse nome.");
    }
    const category: Category = { ...input, id: id ?? newId("cat") };
    data.categories = id ? data.categories.map((c) => (c.id === id ? category : c)) : [...data.categories, category];
    this.write(data);
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const data = this.read();
    data.categories = data.categories.filter((c) => c.id !== id);
    data.products = data.products.map((p) => (p.categoryId === id ? { ...p, categoryId: null } : p));
    this.write(data);
  }

  async saveSettings(settings: Settings): Promise<void> {
    const data = this.read();
    data.settings = settings;
    this.write(data);
    await delay(null, 100);
  }

  async saveZone(id: string | null, input: ZoneInput): Promise<DeliveryZone> {
    const data = this.read();
    const zone: DeliveryZone = { ...input, id: id ?? newId("zona") };
    data.deliveryZones = id ? data.deliveryZones.map((z) => (z.id === id ? zone : z)) : [...data.deliveryZones, zone];
    this.write(data);
    return zone;
  }

  async deleteZone(id: string): Promise<void> {
    const data = this.read();
    data.deliveryZones = data.deliveryZones.filter((z) => z.id !== id);
    this.write(data);
  }

  async uploadImage(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      reader.readAsDataURL(file);
    });
  }
}
