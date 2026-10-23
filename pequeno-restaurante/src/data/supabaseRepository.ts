import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RuntimeConfig } from "../config";
import type { AdminRepository, AdminSession } from "./repository";
import { mapMenu, mapProduct, toCamel, toSnake, type Row } from "./mapping";
import type { Category, DeliveryZone, MenuData, Product, Settings } from "./types";

const BUCKET = "cardapio";

/** Mensagens de erro do Supabase traduzidas para o administrador. */
function fail(error: { message: string; code?: string } | null): void {
  if (!error) return;
  const msg = error.message;
  if (error.code === "42501" || /row-level security|permission denied/i.test(msg)) {
    throw new Error("Sua conta não tem permissão para esta alteração.");
  }
  if (error.code === "23514" || /check constraint/i.test(msg)) {
    throw new Error("O banco recusou os dados: confira os campos e tente de novo.");
  }
  if (/Invalid login credentials/i.test(msg)) throw new Error("E-mail ou senha incorretos.");
  if (/Failed to fetch|NetworkError/i.test(msg)) throw new Error("Sem conexão com o servidor. Tente de novo.");
  throw new Error(msg);
}

export class SupabaseRepository implements AdminRepository {
  readonly mode = "supabase" as const;
  private client: SupabaseClient;

  constructor(config: RuntimeConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "pequeno-restaurante-auth" },
    });
  }

  async loadMenu(options: { includeUnpublished?: boolean } = {}): Promise<MenuData> {
    const products = this.client.from("products").select("*").order("position").order("name");
    const [settings, categories, productRows, zones] = await Promise.all([
      this.client.from("settings").select("*").eq("id", 1).single(),
      this.client.from("categories").select("*").order("position").order("name"),
      options.includeUnpublished ? products : products.eq("published", true),
      this.client.from("delivery_zones").select("*").order("position"),
    ]);
    fail(settings.error);
    fail(categories.error);
    fail(productRows.error);
    fail(zones.error);
    return mapMenu(settings.data as Row, categories.data ?? [], productRows.data ?? [], zones.data ?? []);
  }

  async getSession(): Promise<AdminSession | null> {
    const { data } = await this.client.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const { data: isAdmin, error } = await this.client.rpc("is_admin");
    fail(error);
    return { email: user.email ?? "", isAdmin: isAdmin === true };
  }

  onSessionChange(callback: (event: "signedIn" | "signedOut" | "passwordRecovery") => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") callback("passwordRecovery");
      else if (event === "SIGNED_IN") callback("signedIn");
      else if (event === "SIGNED_OUT") callback("signedOut");
    });
    return () => data.subscription.unsubscribe();
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    fail(error);
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
    fail(error);
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    fail(error);
  }

  async saveProduct(id: string | null, input: Omit<Product, "id">): Promise<Product> {
    const row = toSnake(input);
    const query = id
      ? this.client.from("products").update(row).eq("id", id).select().single()
      : this.client.from("products").insert(row).select().single();
    const { data, error } = await query;
    fail(error);
    return mapProduct(data as Row);
  }

  async updateProduct(id: string, patch: Partial<Omit<Product, "id">>): Promise<void> {
    const { error } = await this.client.from("products").update(toSnake(patch)).eq("id", id);
    fail(error);
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.client.from("products").delete().eq("id", id);
    fail(error);
  }

  async saveCategory(id: string | null, input: Omit<Category, "id">): Promise<Category> {
    const row = toSnake(input);
    const query = id
      ? this.client.from("categories").update(row).eq("id", id).select().single()
      : this.client.from("categories").insert(row).select().single();
    const { data, error } = await query;
    if (error?.code === "23505") throw new Error("Já existe uma categoria com esse nome.");
    fail(error);
    return toCamel<Category>(data as Row);
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.client.from("categories").delete().eq("id", id);
    fail(error);
  }

  async saveSettings(settings: Settings): Promise<void> {
    const { error } = await this.client.from("settings").update(toSnake(settings)).eq("id", 1);
    fail(error);
  }

  async saveZone(id: string | null, input: Omit<DeliveryZone, "id">): Promise<DeliveryZone> {
    const row = toSnake(input);
    const query = id
      ? this.client.from("delivery_zones").update(row).eq("id", id).select().single()
      : this.client.from("delivery_zones").insert(row).select().single();
    const { data, error } = await query;
    fail(error);
    return toCamel<DeliveryZone>(data as Row);
  }

  async deleteZone(id: string): Promise<void> {
    const { error } = await this.client.from("delivery_zones").delete().eq("id", id);
    fail(error);
  }

  async uploadImage(file: Blob, folder: "pratos" | "capa"): Promise<string> {
    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    fail(error);
    return this.client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
}
