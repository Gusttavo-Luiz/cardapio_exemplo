import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMenuReader } from "../data";
import type { MenuReader } from "../data/repository";
import type { MenuData, Product, ProductOption } from "../data/types";
import { cartCount, cartSubtotal, reconcileCart, type LineIssue } from "../lib/cart";
import { formatBRL } from "../lib/money";
import { restaurantJsonLd } from "../lib/restaurantInfo";
import { BagIcon } from "../ui/icons";
import { CartDialog } from "./CartDialog";
import { DailySpecial } from "./DailySpecial";
import { Footer } from "./Footer";
import { pluralItems } from "./format";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { InfoSection } from "./InfoSection";
import { MenuSection } from "./MenuSection";
import { ProductDialog } from "./ProductDialog";
import { useCart } from "./useCart";

const params = new URLSearchParams(window.location.search);
const wantsPreview = params.has("previa");

export function PublicApp() {
  const state = getMenuReader();
  if (state.kind === "error") return <FatalError message={state.message} />;
  return <Menu repo={state.repo} />;
}

function Menu({ repo }: { repo: MenuReader }) {
  const demo = repo.mode === "demo";
  // Na prévia, o leitor passa a ser o do administrador logado, que enxerga itens não publicados.
  const reader = useRef<MenuReader>(repo);
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [preview, setPreview] = useState(false);
  const { lines, dispatch } = useCart();
  const [issues, setIssues] = useState<LineIssue[]>([]);
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(params.get("categoria"));
  const [selected, setSelected] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const previewChecked = useRef(false);
  const previewActive = useRef(false);
  const fetchMenu = useCallback(async () => {
    if (wantsPreview && repo.openPreview && !previewChecked.current) {
      previewChecked.current = true;
      const admin = await repo.openPreview().catch(() => null);
      if (admin) {
        reader.current = admin;
        previewActive.current = true;
        setPreview(true);
      }
    }
    const includeUnpublished = previewActive.current;
    const data = await reader.current.loadMenu({ includeUnpublished });
    setMenu(data);
    // Na prévia, os itens não publicados também podem ir para o carrinho de teste.
    const { lines: updated, issues: found } = reconcileCart(
      linesRef.current,
      includeUnpublished ? data.products.map((p) => ({ ...p, published: true })) : data.products,
    );
    dispatch({ type: "replace", lines: updated });
    setIssues(found);
    return found;
  }, [repo, dispatch]);

  const load = useCallback(() => {
    setLoadError(false);
    fetchMenu().catch(() => setLoadError(true));
  }, [fetchMenu]);

  useEffect(load, [load]);

  // Mantém os avisos do carrinho em dia quando o cliente altera ou remove itens.
  useEffect(() => {
    if (menu) setIssues((prev) => prev.filter((i) => lines.some((l) => l.id === i.lineId)));
  }, [lines, menu]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (categorySlug) url.searchParams.set("categoria", categorySlug);
    else url.searchParams.delete("categoria");
    window.history.replaceState(null, "", url);
  }, [categorySlug]);

  useEffect(() => {
    if (!menu) return;
    document.title = `${menu.settings.restaurantName} | Cardápio Digital`;
    if (demo) {
      // Conteúdo de teste não deve aparecer em buscadores.
      const robots = document.createElement("meta");
      robots.name = "robots";
      robots.content = "noindex";
      document.head.appendChild(robots);
      return () => robots.remove();
    }
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(restaurantJsonLd(menu.settings, window.location.origin + window.location.pathname));
    document.head.appendChild(script);
    return () => script.remove();
  }, [menu, demo]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const daily = useMemo(
    () => (menu?.settings.dailyProductId ? menu.products.find((p) => p.id === menu.settings.dailyProductId) ?? null : null),
    [menu],
  );

  function add(product: Product, option: ProductOption | null, quantity: number, notes: string) {
    if (!product.available) return;
    dispatch({ type: "add", product: preview ? { ...product, published: true } : product, option, quantity, notes });
    setSelected(null);
    setToast(`${quantity} × ${product.name} adicionado ao pedido`);
  }

  if (loadError) return <LoadError onRetry={load} />;
  if (!menu) return <LoadingScreen />;

  const count = cartCount(lines);

  return (
    <>
      <a href="#cardapio" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Pular para o cardápio
      </a>
      {demo && <DemoBanner />}
      {preview && <PreviewBanner />}
      <Header name={menu.settings.restaurantName} tagline={menu.settings.tagline} count={count} onOpenCart={() => setCartOpen(true)} />
      <main className={count > 0 ? "pb-24" : ""}>
        <Hero settings={menu.settings} />
        {daily && <DailySpecial product={daily} demo={demo} onOpen={setSelected} />}
        <MenuSection
          categories={menu.categories}
          products={menu.products}
          demo={demo}
          query={query}
          onQueryChange={setQuery}
          categorySlug={categorySlug}
          onCategoryChange={setCategorySlug}
          onOpenProduct={setSelected}
        />
        <InfoSection settings={menu.settings} />
      </main>
      <Footer settings={menu.settings} />

      {count > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="mx-auto flex min-h-14 w-full max-w-lg items-center gap-3 rounded-full bg-brown px-5 text-left text-cream shadow-lg"
          >
            <BagIcon />
            <span className="flex-1 font-semibold">Ver pedido · {pluralItems(count)}</span>
            <span className="font-semibold tabular-nums">{formatBRL(cartSubtotal(lines))}</span>
          </button>
        </div>
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4">
        {toast && <p className="rounded-full bg-olive-ink px-4 py-2 text-sm font-medium text-white shadow-lg">{toast}</p>}
      </div>

      <ProductDialog product={selected} demo={demo} onClose={() => setSelected(null)} onAdd={add} />
      <CartDialog
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        dispatch={dispatch}
        issues={issues}
        settings={menu.settings}
        zones={menu.deliveryZones}
        demo={demo}
        onRevalidate={fetchMenu}
      />
    </>
  );
}

function DemoBanner() {
  return (
    <div role="note" className="bg-amber-100 px-4 py-2.5 text-center text-sm text-amber-950">
      <strong>Modo de demonstração.</strong> Os pratos e preços abaixo são conteúdo de teste e não representam o cardápio do restaurante.
    </div>
  );
}

function PreviewBanner() {
  return (
    <div role="note" className="bg-brown px-4 py-2.5 text-center text-sm text-cream">
      <strong>Prévia do administrador.</strong> Itens não publicados aparecem marcados e não são vistos pelos clientes.
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando o cardápio…</span>
      <div className="h-8 w-48 animate-pulse rounded-full bg-cream-deep" />
      <div className="mt-6 h-40 animate-pulse rounded-3xl bg-cream-deep" />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-cream-deep sm:h-36" />
        ))}
      </div>
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center" role="alert">
      <p className="font-serif text-2xl font-semibold">Não foi possível carregar o cardápio</p>
      <p className="mt-2 text-warmgray">Verifique a sua conexão com a internet e tente novamente.</p>
      <button type="button" className="btn-primary mt-6" onClick={onRetry}>
        Tentar de novo
      </button>
    </div>
  );
}

function FatalError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center" role="alert">
      <p className="font-serif text-2xl font-semibold">Cardápio temporariamente indisponível</p>
      <p className="mt-2 text-warmgray">{message}</p>
    </div>
  );
}
