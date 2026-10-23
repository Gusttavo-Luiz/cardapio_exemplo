// Configuração lida em tempo de execução do arquivo public/config.js, para que o endereço do
// Supabase possa ser trocado sem recompilar o site.

export interface RuntimeConfig {
  supabaseUrl: string;
  /** Chave pública ("publishable" ou "anon"). Nunca a chave secreta / service_role. */
  supabaseKey: string;
  /** Endereço público do cardápio, usado no QR Code. */
  publicUrl: string;
}

declare global {
  interface Window {
    CARDAPIO_CONFIG?: Partial<RuntimeConfig>;
  }
}

/** Reconhece chaves que dão acesso total ao banco e não podem ficar no navegador. */
export function isSecretKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json?.role === "service_role";
  } catch {
    return false;
  }
}

export type ConfigState =
  | { kind: "supabase"; config: RuntimeConfig }
  | { kind: "demo"; config: RuntimeConfig }
  | { kind: "error"; message: string };

export function readConfig(): ConfigState {
  const raw = (typeof window !== "undefined" && window.CARDAPIO_CONFIG) || {};
  const config: RuntimeConfig = {
    supabaseUrl: (raw.supabaseUrl ?? "").trim(),
    supabaseKey: (raw.supabaseKey ?? "").trim(),
    publicUrl: (raw.publicUrl ?? "").trim(),
  };
  if (!config.supabaseUrl || !config.supabaseKey) return { kind: "demo", config };
  if (isSecretKey(config.supabaseKey)) {
    return {
      kind: "error",
      message:
        "A chave configurada em config.js é uma chave secreta do Supabase e não pode ser usada no site. " +
        "Use a chave pública (publishable/anon) e gere uma nova chave secreta no painel do Supabase.",
    };
  }
  if (!/^https:\/\/\S+$/.test(config.supabaseUrl)) {
    return { kind: "error", message: "O endereço do Supabase em config.js precisa começar com https://." };
  }
  return { kind: "supabase", config };
}
