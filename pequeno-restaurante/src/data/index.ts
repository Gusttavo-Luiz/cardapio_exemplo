import { readConfig, type RuntimeConfig } from "../config";
import { DemoRepository } from "./demoRepository";
import type { AdminRepository, MenuReader } from "./repository";
import { RestMenuReader } from "./restReader";

export type Ready<T> = { kind: "ready"; repo: T; config: RuntimeConfig } | { kind: "error"; message: string };

/** Leitor do cardápio público: leve, sem a biblioteca do Supabase. */
export function getMenuReader(): Ready<MenuReader> {
  const state = readConfig();
  if (state.kind === "error") return state;
  const repo = state.kind === "supabase" ? new RestMenuReader(state.config) : new DemoRepository();
  return { kind: "ready", repo, config: state.config };
}

/** Repositório completo do painel (carrega a biblioteca do Supabase). */
export async function getAdminRepository(): Promise<Ready<AdminRepository>> {
  const state = readConfig();
  if (state.kind === "error") return state;
  if (state.kind === "demo") return { kind: "ready", repo: new DemoRepository(), config: state.config };
  const { SupabaseRepository } = await import("./supabaseRepository");
  return { kind: "ready", repo: new SupabaseRepository(state.config), config: state.config };
}
