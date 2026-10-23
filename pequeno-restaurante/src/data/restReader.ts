import type { RuntimeConfig } from "../config";
import { mapMenu, type Row } from "./mapping";
import type { MenuReader } from "./repository";
import type { MenuData } from "./types";

/**
 * Leitura do cardápio público direto pela API REST do Supabase, com fetch.
 * Evita baixar a biblioteca completa do Supabase no celular de quem só consulta o cardápio;
 * ela só é carregada na prévia do administrador.
 */
export class RestMenuReader implements MenuReader {
  readonly mode = "supabase" as const;
  constructor(private config: RuntimeConfig) {}

  private async get(path: string): Promise<Row[]> {
    const headers: Record<string, string> = { apikey: this.config.supabaseKey, Accept: "application/json" };
    // Chaves antigas ("anon") são JWT e também vão no Authorization; as novas ("publishable"), não.
    if (this.config.supabaseKey.split(".").length === 3) headers.Authorization = `Bearer ${this.config.supabaseKey}`;
    const response = await fetch(`${this.config.supabaseUrl.replace(/\/+$/, "")}/rest/v1/${path}`, { headers });
    if (!response.ok) throw new Error(`Erro ${response.status} ao carregar o cardápio.`);
    return (await response.json()) as Row[];
  }

  async loadMenu(): Promise<MenuData> {
    const [settings, categories, products, zones] = await Promise.all([
      this.get("settings?id=eq.1&select=*"),
      this.get("categories?select=*&order=position,name"),
      this.get("products?select=*&published=eq.true&order=position,name"),
      this.get("delivery_zones?select=*&order=position"),
    ]);
    if (!settings[0]) throw new Error("Configurações do restaurante não encontradas.");
    return mapMenu(settings[0], categories, products, zones);
  }

  async openPreview(): Promise<MenuReader | null> {
    const { SupabaseRepository } = await import("./supabaseRepository");
    const repo = new SupabaseRepository(this.config);
    const session = await repo.getSession();
    return session?.isAdmin ? repo : null;
  }
}
