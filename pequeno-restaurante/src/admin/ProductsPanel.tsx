import { useMemo, useState } from "react";
import type { AdminRepository, ProductInput } from "../data/repository";
import type { MenuData, Product } from "../data/types";
import { matchesSearch } from "../lib/text";
import { priceLabel } from "../public/format";
import { Dialog } from "../ui/Dialog";
import { StarIcon } from "../ui/icons";
import { ProductImage } from "../ui/ProductImage";
import { ProductForm } from "./ProductForm";
import { Alert, ConfirmButton, Panel, Switch, useAction } from "./ui";

interface Props {
  repo: AdminRepository;
  menu: MenuData;
  reload: () => Promise<void>;
}

export function ProductsPanel({ repo, menu, reload }: Props) {
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [query, setQuery] = useState("");
  const { busy, error, success, run } = useAction();
  const categoryName = (id: string | null) => menu.categories.find((c) => c.id === id)?.name ?? "Sem categoria";
  const dailyId = menu.settings.dailyProductId;

  const list = useMemo(
    () =>
      menu.products
        .filter((p) => !categoryFilter || (categoryFilter === "none" ? !p.categoryId : p.categoryId === categoryFilter))
        .filter((p) => matchesSearch(query, p.name, p.description)),
    [menu.products, categoryFilter, query],
  );

  const patch = (p: Product, changes: Partial<ProductInput>, message: string) =>
    run(async () => {
      await repo.updateProduct(p.id, changes);
      await reload();
    }, message);

  const setDaily = (id: string | null) =>
    run(async () => {
      await repo.saveSettings({ ...menu.settings, dailyProductId: id });
      await reload();
    }, id ? "Prato do dia atualizado." : "Destaque do prato do dia removido.");

  async function save(id: string | null, input: ProductInput) {
    await repo.saveProduct(id, input);
    await reload();
    setEditing(null);
  }

  return (
    <Panel
      title="Pratos"
      description="Cadastre os pratos, altere preços e marque o que está disponível hoje. Só os pratos publicados aparecem para os clientes."
      actions={
        <button type="button" className="btn-primary" onClick={() => setEditing("new")}>
          Novo prato
        </button>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_14rem]">
        <input type="search" placeholder="Buscar prato" aria-label="Buscar prato" className="field" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="field" aria-label="Filtrar por categoria" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Todas as categorias</option>
          {menu.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="none">Sem categoria</option>
        </select>
      </div>
      <div className="mb-3 space-y-2" aria-live="polite">
        {error && <Alert kind="error">{error}</Alert>}
        {success && <Alert kind="success">{success}</Alert>}
      </div>

      {menu.products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brown/20 p-6 text-center text-warmgray">Nenhum prato cadastrado ainda. Use “Novo prato” para começar.</p>
      ) : list.length === 0 ? (
        <p className="p-6 text-center text-warmgray">Nenhum prato encontrado com esses filtros.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {list.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
              <ProductImage product={p} compact className="h-16 w-16 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-warmgray">
                  {categoryName(p.categoryId)} · {priceLabel(p)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {dailyId === p.id && <span className="chip bg-olive/15 text-olive-ink">Prato do dia</span>}
                  {!p.published && <span className="chip bg-brown text-cream">Não publicado</span>}
                  {!p.available && <span className="chip bg-brown/10">Indisponível</span>}
                  {p.imageUrl && p.imageIsPlaceholder && <span className="chip bg-amber-100 text-amber-900">Imagem provisória</span>}
                  {!p.imageUrl && <span className="chip bg-amber-100 text-amber-900">Sem foto</span>}
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 sm:w-auto">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={p.available} disabled={busy} label={`Disponível: ${p.name}`} onChange={(v) => patch(p, { available: v }, v ? "Marcado como disponível." : "Marcado como indisponível.")} />
                  Disponível
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={p.published} disabled={busy} label={`Publicado: ${p.name}`} onChange={(v) => patch(p, { published: v }, v ? "Prato publicado no cardápio." : "Prato retirado do cardápio.")} />
                  Publicado
                </label>
                <button
                  type="button"
                  disabled={busy}
                  className={`inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-medium ${dailyId === p.id ? "bg-olive/15 text-olive-ink" : "hover:bg-brown/5"}`}
                  onClick={() => setDaily(dailyId === p.id ? null : p.id)}
                  aria-pressed={dailyId === p.id}
                >
                  <StarIcon width={16} height={16} /> {dailyId === p.id ? "Remover destaque" : "Prato do dia"}
                </button>
                <button type="button" className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-brown/5" onClick={() => setEditing(p)}>
                  Editar
                </button>
                <ConfirmButton
                  onConfirm={() =>
                    run(async () => {
                      await repo.deleteProduct(p.id);
                      await reload();
                    }, "Prato excluído.")
                  }
                >
                  Excluir
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {dailyId && !menu.products.some((p) => p.id === dailyId && p.published) && (
        <p className="mt-3 text-sm text-warmgray">O prato do dia escolhido não está publicado, então a seção fica oculta no cardápio.</p>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} labelledBy="form-prato-titulo">
        {editing !== null && (
          <ProductForm
            key={editing === "new" ? "new" : editing.id}
            repo={repo}
            product={editing === "new" ? null : editing}
            categories={menu.categories}
            nextPosition={(Math.max(0, ...menu.products.map((p) => p.position)) || 0) + 10}
            onCancel={() => setEditing(null)}
            onSave={save}
          />
        )}
      </Dialog>
    </Panel>
  );
}
