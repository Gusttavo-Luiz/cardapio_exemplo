import type { Category, DeliveryZone, MenuData, Product, Settings } from "./types";

export type ProductInput = Omit<Product, "id">;
export type CategoryInput = Omit<Category, "id">;
export type ZoneInput = Omit<DeliveryZone, "id">;

export interface AdminSession {
  email: string;
  isAdmin: boolean;
}

/** Leitura do cardápio público. */
export interface MenuReader {
  readonly mode: "supabase" | "demo";
  /** includeUnpublished só tem efeito para administradores (o banco filtra pelas permissões). */
  loadMenu(options?: { includeUnpublished?: boolean }): Promise<MenuData>;
  /** Para a prévia do painel: devolve um leitor que enxerga itens não publicados, se quem está logado é administrador. */
  openPreview?(): Promise<MenuReader | null>;
}

/** Operações do painel administrativo. */
export interface AdminRepository extends MenuReader {
  getSession(): Promise<AdminSession | null>;
  onSessionChange(callback: (event: "signedIn" | "signedOut" | "passwordRecovery") => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;

  saveProduct(id: string | null, input: ProductInput): Promise<Product>;
  updateProduct(id: string, patch: Partial<ProductInput>): Promise<void>;
  deleteProduct(id: string): Promise<void>;

  saveCategory(id: string | null, input: CategoryInput): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  saveSettings(settings: Settings): Promise<void>;

  saveZone(id: string | null, input: ZoneInput): Promise<DeliveryZone>;
  deleteZone(id: string): Promise<void>;

  /** Envia a imagem e devolve o endereço público dela. */
  uploadImage(file: Blob, folder: "pratos" | "capa"): Promise<string>;
}
