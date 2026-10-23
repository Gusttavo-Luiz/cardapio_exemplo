import { useMemo } from "react";
import type { Category, Product } from "../data/types";
import { matchesSearch } from "../lib/text";
import { CloseIcon, SearchIcon } from "../ui/icons";
import { ProductCard } from "./ProductCard";

export const OTHER_CATEGORY: Category = { id: "__outros", name: "Outros", slug: "outros", position: 1e9, active: true };

interface MenuSectionProps {
  categories: Category[];
  products: Product[];
  demo: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  categorySlug: string | null;
  onCategoryChange: (slug: string | null) => void;
  onOpenProduct: (p: Product) => void;
}

/** Agrupa os pratos por categoria, mantendo só as categorias ativas que têm pratos. */
export function groupByCategory(categories: Category[], products: Product[]) {
  const groups = categories
    .filter((c) => c.active)
    .sort((a, b) => a.position - b.position)
    .map((category) => ({ category, products: products.filter((p) => p.categoryId === category.id) }))
    .filter((g) => g.products.length > 0);
  // Pratos sem categoria aparecem em "Outros"; os de categorias desativadas ficam fora do cardápio.
  const known = new Set(categories.map((c) => c.id));
  const orphans = products.filter((p) => !p.categoryId || !known.has(p.categoryId));
  if (orphans.length > 0) groups.push({ category: OTHER_CATEGORY, products: orphans });
  return groups;
}

export function MenuSection(props: MenuSectionProps) {
  const { categories, products, demo, query, onQueryChange, categorySlug, onCategoryChange, onOpenProduct } = props;

  const groups = useMemo(() => groupByCategory(categories, products), [categories, products]);
  const visibleGroups = useMemo(
    () =>
      groups
        .filter((g) => !categorySlug || g.category.slug === categorySlug)
        .map((g) => ({ ...g, products: g.products.filter((p) => matchesSearch(query, p.name, p.description)) }))
        .filter((g) => g.products.length > 0),
    [groups, categorySlug, query],
  );
  const selected = groups.find((g) => g.category.slug === categorySlug)?.category ?? null;
  const resultCount = visibleGroups.reduce((n, g) => n + g.products.length, 0);

  return (
    <section id="cardapio" aria-labelledby="cardapio-titulo" className="pt-8">
      <div className="mx-auto max-w-6xl px-4">
        <h2 id="cardapio-titulo" className="text-2xl font-semibold sm:text-3xl">
          Cardápio
        </h2>
        <div className="relative mt-4">
          <label htmlFor="busca" className="sr-only">
            O que você está procurando?
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-warmgray" />
          <input
            id="busca"
            type="search"
            inputMode="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="O que você está procurando?"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="field rounded-full py-3.5 pr-12 pl-12"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-warmgray hover:bg-brown/5"
              aria-label="Limpar busca"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      {groups.length > 1 && (
        <nav aria-label="Categorias" className="sticky top-16 z-20 mt-3 border-b border-line bg-cream/95 backdrop-blur">
          <div className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3">
            <CategoryChip active={!selected} onClick={() => onCategoryChange(null)}>
              Todos
            </CategoryChip>
            {groups.map(({ category }) => (
              <CategoryChip key={category.id} active={selected?.id === category.id} onClick={() => onCategoryChange(category.slug)}>
                {category.name}
              </CategoryChip>
            ))}
          </div>
        </nav>
      )}

      <div className="mx-auto max-w-6xl px-4">
        <p className="sr-only" aria-live="polite">
          {query || selected ? `${resultCount} ${resultCount === 1 ? "prato encontrado" : "pratos encontrados"}` : ""}
        </p>
        {products.length === 0 ? (
          <EmptyState title="Cardápio em atualização" text="Os pratos ainda estão sendo cadastrados. Volte em breve ou fale com o restaurante." />
        ) : visibleGroups.length === 0 ? (
          <EmptyState
            title="Nenhum prato encontrado"
            text={query ? `Não encontramos nada para “${query}”${selected ? ` em ${selected.name}` : ""}.` : "Não há pratos nesta categoria."}
            action={
              <button
                type="button"
                className="btn-secondary mt-4"
                onClick={() => {
                  onQueryChange("");
                  onCategoryChange(null);
                }}
              >
                Ver todo o cardápio
              </button>
            }
          />
        ) : (
          visibleGroups.map(({ category, products: items }) => (
            <section key={category.id} aria-labelledby={`cat-${category.slug}`} className="pt-6">
              <h3 id={`cat-${category.slug}`} className="mb-3 text-xl font-semibold text-brown">
                {category.name}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} demo={demo} onOpen={onOpenProduct} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
        active ? "border-brown bg-brown text-cream" : "border-brown/15 bg-white text-brown hover:border-brown/40"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="my-8 rounded-2xl border border-dashed border-brown/20 bg-white/60 px-6 py-10 text-center">
      <p className="font-serif text-xl font-semibold">{title}</p>
      <p className="mt-1 text-warmgray">{text}</p>
      {action}
    </div>
  );
}
