import type { MenuData } from "../data/types";
import { pendingItems } from "./pending";
import { Panel } from "./ui";

export function OverviewPanel({ menu, onNavigate }: { menu: MenuData; onNavigate: (tab: string) => void }) {
  const items = pendingItems(menu);
  const required = items.filter((i) => i.level === "required");
  const recommended = items.filter((i) => i.level === "recommended");
  const published = menu.products.filter((p) => p.published);
  const unavailable = published.filter((p) => !p.available).length;
  const daily = menu.products.find((p) => p.id === menu.settings.dailyProductId);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pratos publicados" value={published.length} />
        <Stat label="Indisponíveis agora" value={unavailable} />
        <Stat label="Prato do dia" value={daily ? daily.name : "Nenhum"} />
      </div>
      <Panel
        title="Antes de divulgar o cardápio"
        description="Informações que ainda dependem de confirmação do proprietário. Itens não confirmados aparecem no site com o aviso “a confirmar”."
      >
        {items.length === 0 ? (
          <p className="rounded-xl bg-olive/10 px-3 py-2 font-medium text-olive-ink">Tudo confirmado. O cardápio está pronto para ser divulgado.</p>
        ) : (
          <div className="space-y-5">
            {required.length > 0 && <List title="Precisa de confirmação" items={required} onNavigate={onNavigate} />}
            {recommended.length > 0 && <List title="Recomendado" items={recommended} onNavigate={onNavigate} />}
          </div>
        )}
      </Panel>
    </>
  );
}

function List({ title, items, onNavigate }: { title: string; items: ReturnType<typeof pendingItems>; onNavigate: (tab: string) => void }) {
  return (
    <div>
      <h3 className="mb-2 font-sans text-sm font-semibold tracking-wide text-warmgray uppercase">{title}</h3>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="text-sm">{i.text}</span>
            <button type="button" className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-terracotta-ink hover:bg-terracotta/10" onClick={() => onNavigate(i.tab)}>
              Resolver
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-sm text-warmgray">{label}</p>
      <p className="mt-1 truncate font-serif text-2xl font-semibold">{value}</p>
    </div>
  );
}
