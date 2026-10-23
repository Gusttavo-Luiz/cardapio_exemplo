import { useState } from "react";
import type { AdminRepository } from "../data/repository";
import type { Category, MenuData } from "../data/types";
import { slugify } from "../lib/text";
import { categorySchema, firstError } from "../lib/validation";
import { Alert, ConfirmButton, Panel, Switch, useAction } from "./ui";

interface Props {
  repo: AdminRepository;
  menu: MenuData;
  reload: () => Promise<void>;
}

export function CategoriesPanel({ repo, menu, reload }: Props) {
  const categories = [...menu.categories].sort((a, b) => a.position - b.position);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const { busy, error, success, run, setError } = useAction();
  const count = (id: string) => menu.products.filter((p) => p.categoryId === id).length;

  async function save(id: string | null, input: Omit<Category, "id">, message: string): Promise<boolean> {
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return false;
    }
    return run(async () => {
      await repo.saveCategory(id, parsed.data);
      await reload();
    }, message);
  }

  /** Troca a posição com a categoria vizinha. */
  function move(index: number, delta: -1 | 1) {
    const a = categories[index];
    const b = categories[index + delta];
    if (!a || !b) return;
    // Posições iguais não trocariam de lugar; usa o índice como base quando preciso.
    const posA = a.position === b.position ? index * 10 : a.position;
    const posB = a.position === b.position ? (index + delta) * 10 : b.position;
    run(async () => {
      await repo.saveCategory(a.id, { ...a, position: posB });
      await repo.saveCategory(b.id, { ...b, position: posA });
      await reload();
    });
  }

  return (
    <Panel
      title="Categorias"
      description="O cardápio mostra apenas as categorias ativas que têm pratos publicados. A ordem aqui é a ordem das abas no site."
    >
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const position = (Math.max(0, ...categories.map((c) => c.position)) || 0) + 10;
          save(null, { name: newName.trim(), slug: slugify(newName), position, active: true }, "Categoria criada.").then((ok) => ok && setNewName(""));
        }}
      >
        <label htmlFor="nova-cat" className="sr-only">
          Nome da nova categoria
        </label>
        <input id="nova-cat" className="field flex-1" placeholder="Nova categoria" maxLength={60} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" className="btn-primary" disabled={busy || newName.trim().length < 2}>
          Adicionar
        </button>
      </form>
      <div className="mb-3 space-y-2">
        {error && <Alert kind="error">{error}</Alert>}
        {success && <Alert kind="success">{success}</Alert>}
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {categories.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="flex flex-col">
              <button type="button" className="h-6 w-8 rounded text-sm hover:bg-brown/5 disabled:opacity-30" disabled={i === 0 || busy} onClick={() => move(i, -1)} aria-label={`Mover ${c.name} para cima`}>
                ▲
              </button>
              <button type="button" className="h-6 w-8 rounded text-sm hover:bg-brown/5 disabled:opacity-30" disabled={i === categories.length - 1 || busy} onClick={() => move(i, 1)} aria-label={`Mover ${c.name} para baixo`}>
                ▼
              </button>
            </div>
            <div className="min-w-0 flex-1">
              {renaming?.id === c.id ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save(c.id, { ...c, name: renaming.name.trim(), slug: slugify(renaming.name) }, "Categoria renomeada.").then((ok) => ok && setRenaming(null));
                  }}
                >
                  <input className="field py-2" aria-label="Novo nome" autoFocus maxLength={60} value={renaming.name} onChange={(e) => setRenaming({ id: c.id, name: e.target.value })} />
                  <button type="submit" className="btn-primary min-h-10 text-sm">
                    Salvar
                  </button>
                  <button type="button" className="btn-ghost min-h-10 text-sm" onClick={() => setRenaming(null)}>
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-warmgray">
                    {count(c.id)} prato(s) · endereço: ?categoria={c.slug}
                  </p>
                </>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={c.active} disabled={busy} label={`Categoria ${c.name} ativa`} onChange={(v) => save(c.id, { ...c, active: v }, v ? "Categoria ativada." : "Categoria desativada.")} />
              Ativa
            </label>
            {renaming?.id !== c.id && (
              <button type="button" className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-brown/5" onClick={() => setRenaming({ id: c.id, name: c.name })}>
                Renomear
              </button>
            )}
            <ConfirmButton
              onConfirm={() =>
                run(async () => {
                  await repo.deleteCategory(c.id);
                  await reload();
                }, "Categoria excluída. Os pratos dela ficaram sem categoria.")
              }
            >
              Excluir
            </ConfirmButton>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
