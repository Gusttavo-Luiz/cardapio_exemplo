import { useCallback, useEffect, useRef, useState } from "react";
import { getAdminRepository, type Ready } from "../data";
import type { AdminRepository, AdminSession } from "../data/repository";
import type { MenuData } from "../data/types";
import { LoginScreen, NewPasswordScreen } from "./AuthScreens";
import { CategoriesPanel } from "./CategoriesPanel";
import { DeliveryPanel } from "./DeliveryPanel";
import { OverviewPanel } from "./OverviewPanel";
import { ProductsPanel } from "./ProductsPanel";
import { QrPanel } from "./QrPanel";
import { SettingsPanel } from "./SettingsPanel";
import { Alert } from "./ui";

const TABS = [
  { id: "inicio", label: "Início" },
  { id: "pratos", label: "Pratos" },
  { id: "categorias", label: "Categorias" },
  { id: "restaurante", label: "Restaurante" },
  { id: "entrega", label: "Entrega" },
  { id: "divulgacao", label: "QR Code" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function AdminApp() {
  const [state, setState] = useState<Ready<AdminRepository> | null>(null);
  useEffect(() => {
    getAdminRepository()
      .then(setState)
      .catch(() => setState({ kind: "error", message: "Não foi possível carregar o painel. Verifique a conexão." }));
  }, []);
  if (!state) return <Centered title="Carregando…" />;
  if (state.kind === "error") return <Centered title="Configuração inválida">{state.message}</Centered>;
  // Sem Supabase, o painel não tem como autenticar ninguém. O painel de demonstração (que grava
  // só no navegador) existe apenas no servidor de desenvolvimento e nunca vai para o site publicado.
  if (state.repo.mode === "demo" && !import.meta.env.DEV) {
    return (
      <Centered title="Painel ainda não configurado">
        O painel administrativo precisa de um banco de dados com login (Supabase). Siga o passo a passo do README para criar o projeto e preencher o
        arquivo <code>config.js</code>.
      </Centered>
    );
  }
  return <AuthGate repo={state.repo} publicUrl={state.config.publicUrl} />;
}

type AuthState = { kind: "loading" } | { kind: "signedOut" } | { kind: "recovery" } | { kind: "signedIn"; session: AdminSession } | { kind: "error"; message: string };

function AuthGate({ repo, publicUrl }: { repo: AdminRepository; publicUrl: string }) {
  const [auth, setAuth] = useState<AuthState>({ kind: "loading" });
  // Durante a troca de senha (link do e-mail), a tela de nova senha tem prioridade.
  const recovering = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const session = await repo.getSession();
      if (recovering.current) return;
      setAuth(session ? { kind: "signedIn", session } : { kind: "signedOut" });
    } catch (e) {
      setAuth({ kind: "error", message: e instanceof Error ? e.message : "Erro ao verificar o login." });
    }
  }, [repo]);

  useEffect(() => {
    refresh();
    return repo.onSessionChange((event) => {
      if (event === "passwordRecovery") {
        recovering.current = true;
        setAuth({ kind: "recovery" });
      } else if (event === "signedOut") {
        setAuth({ kind: "signedOut" });
      } else {
        // Adiado: chamadas ao Supabase dentro deste aviso podem travar a biblioteca.
        setTimeout(refresh, 0);
      }
    });
  }, [repo, refresh]);

  function passwordChanged() {
    recovering.current = false;
    window.history.replaceState(null, "", window.location.pathname);
    refresh();
  }

  if (auth.kind === "loading") return <Centered title="Carregando…" />;
  if (auth.kind === "error") return <Centered title="Não foi possível abrir o painel">{auth.message}</Centered>;
  if (auth.kind === "recovery") return <NewPasswordScreen repo={repo} onDone={passwordChanged} />;
  if (auth.kind === "signedOut") return <LoginScreen repo={repo} onSignedIn={refresh} />;
  if (!auth.session.isAdmin) {
    return (
      <Centered title="Acesso não autorizado">
        A conta {auth.session.email} não tem permissão de administrador.
        <button type="button" className="btn-secondary mt-6" onClick={() => repo.signOut().then(refresh)}>
          Sair
        </button>
      </Centered>
    );
  }
  return <Dashboard repo={repo} session={auth.session} publicUrl={publicUrl} onSignOut={() => repo.signOut().then(refresh)} />;
}

function Dashboard({ repo, session, publicUrl, onSignOut }: { repo: AdminRepository; session: AdminSession; publicUrl: string; onSignOut: () => void }) {
  const initialTab = (TABS.find((t) => `#${t.id}` === window.location.hash)?.id ?? "inicio") as TabId;
  const [tab, setTab] = useState<TabId>(initialTab);
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setMenu(await repo.loadMenu({ includeUnpublished: true }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar os dados.");
    }
  }, [repo]);

  useEffect(() => {
    reload();
  }, [reload]);

  function select(id: TabId) {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <div className="min-h-dvh">
      {repo.mode === "demo" && (
        <div role="note" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950 print:hidden">
          <strong>Painel de desenvolvimento.</strong> Sem Supabase configurado: as alterações ficam só neste navegador e não são publicadas.
        </div>
      )}
      <header className="border-b border-line bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg font-semibold">Painel do cardápio</p>
            <p className="truncate text-xs text-warmgray">{session.email}</p>
          </div>
          <a className="btn-secondary min-h-10 text-sm" href="../?previa=1" target="_blank" rel="noopener">
            Visualizar prévia
          </a>
          <a className="btn-ghost min-h-10 text-sm" href="../" target="_blank" rel="noopener">
            Ver cardápio
          </a>
          <button type="button" className="btn-ghost min-h-10 text-sm" onClick={onSignOut}>
            Sair
          </button>
        </div>
        <nav aria-label="Seções do painel" className="no-scrollbar mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold ${tab === t.id ? "border-terracotta text-brown" : "border-transparent text-warmgray hover:text-brown"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {error && <Alert kind="error">{error}</Alert>}
        {!menu ? (
          !error && <p className="text-warmgray">Carregando…</p>
        ) : (
          <>
            {tab === "inicio" && <OverviewPanel menu={menu} onNavigate={(id) => select(id as TabId)} />}
            {tab === "pratos" && <ProductsPanel repo={repo} menu={menu} reload={reload} />}
            {tab === "categorias" && <CategoriesPanel repo={repo} menu={menu} reload={reload} />}
            {tab === "restaurante" && <SettingsPanel repo={repo} menu={menu} reload={reload} />}
            {tab === "entrega" && <DeliveryPanel repo={repo} menu={menu} reload={reload} />}
            {tab === "divulgacao" && <QrPanel publicUrl={publicUrl} restaurantName={menu.settings.restaurantName} />}
          </>
        )}
      </main>
    </div>
  );
}

export function Centered({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children && <div className="mt-3 text-warmgray">{children}</div>}
    </div>
  );
}
