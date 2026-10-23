import { useState } from "react";
import type { AdminRepository } from "../data/repository";
import type { DeliveryFeeMode, DeliveryZone, MenuData } from "../data/types";
import { centsToInput, formatBRL, parseBRL } from "../lib/money";
import { firstError, zoneSchema } from "../lib/validation";
import { Field } from "./SettingsPanel";
import { Alert, ConfirmButton, Panel, Switch, useAction } from "./ui";

interface Props {
  repo: AdminRepository;
  menu: MenuData;
  reload: () => Promise<void>;
}

const MODES: { id: DeliveryFeeMode; label: string; help: string }[] = [
  { id: "none", label: "Sem taxa cadastrada", help: "O cliente vê “taxa a ser informada pelo restaurante”, e o total não inclui entrega." },
  { id: "fixed", label: "Taxa única", help: "O mesmo valor para qualquer endereço atendido." },
  { id: "zones", label: "Taxa por região", help: "O cliente escolhe a região; regiões não listadas ficam com taxa a confirmar." },
];

export function DeliveryPanel({ repo, menu, reload }: Props) {
  const s = menu.settings;
  const [mode, setMode] = useState<DeliveryFeeMode>(s.deliveryFeeMode);
  const [fee, setFee] = useState(centsToInput(s.deliveryFeeCents));
  const [note, setNote] = useState(s.deliveryNote);
  const settingsAction = useAction();

  function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    const feeCents = mode === "fixed" ? parseBRL(fee) : s.deliveryFeeCents;
    if (feeCents === null) return settingsAction.setError("Informe a taxa no formato 5,00.");
    settingsAction.run(async () => {
      await repo.saveSettings({ ...s, deliveryFeeMode: mode, deliveryFeeCents: feeCents, deliveryNote: note.trim() });
      await reload();
    }, "Configuração de entrega salva.");
  }

  return (
    <div className="space-y-4">
      {!(s.delivery && s.servicesConfirmed) && (
        <Alert kind="info">A entrega não aparece para os clientes enquanto não estiver marcada e confirmada na aba Restaurante → Atendimento.</Alert>
      )}
      <Panel title="Taxa de entrega" description="Só é cobrada no pedido a taxa cadastrada aqui.">
        <form onSubmit={saveSettings} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="sr-only">Tipo de taxa</legend>
            {MODES.map((m) => (
              <label key={m.id} className={`flex items-start gap-3 rounded-xl border p-3 ${mode === m.id ? "border-olive ring-2 ring-olive/30" : "border-line"}`}>
                <input type="radio" name="modo-taxa" className="mt-1 h-5 w-5 accent-olive" checked={mode === m.id} onChange={() => setMode(m.id)} />
                <span>
                  <span className="block font-semibold">{m.label}</span>
                  <span className="block text-sm text-warmgray">{m.help}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {mode === "fixed" && (
            <div className="w-40">
              <Field label="Valor da taxa (R$)" id="d-taxa">
                <input id="d-taxa" className="field" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
              </Field>
            </div>
          )}
          <Field label="Aviso sobre entrega (opcional)" id="d-nota" hint="Ex.: área atendida, pedido mínimo confirmado, tempo médio.">
            <input id="d-nota" className="field" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {settingsAction.error && <Alert kind="error">{settingsAction.error}</Alert>}
          {settingsAction.success && <Alert kind="success">{settingsAction.success}</Alert>}
          <button type="submit" className="btn-primary" disabled={settingsAction.busy}>
            Salvar
          </button>
        </form>
      </Panel>
      {mode === "zones" && <ZonesEditor repo={repo} zones={menu.deliveryZones} reload={reload} />}
    </div>
  );
}

function ZonesEditor({ repo, zones, reload }: { repo: AdminRepository; zones: DeliveryZone[]; reload: () => Promise<void> }) {
  const sorted = [...zones].sort((a, b) => a.position - b.position);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const { busy, error, success, run, setError } = useAction();

  async function save(id: string | null, input: Omit<DeliveryZone, "id">, message: string) {
    const parsed = zoneSchema.safeParse(input);
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return false;
    }
    return run(async () => {
      await repo.saveZone(id, parsed.data);
      await reload();
    }, message);
  }

  return (
    <Panel title="Regiões de entrega" description="Bairros ou regiões atendidos, cada um com a sua taxa.">
      <form
        className="mb-4 grid gap-2 sm:grid-cols-[1fr_8rem_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          const feeCents = parseBRL(fee);
          if (feeCents === null) return setError("Informe a taxa no formato 5,00.");
          const position = (Math.max(0, ...zones.map((z) => z.position)) || 0) + 10;
          if (await save(null, { name: name.trim(), feeCents, active: true, position }, "Região adicionada.")) {
            setName("");
            setFee("");
          }
        }}
      >
        <input className="field" aria-label="Nome da região" placeholder="Região ou bairro" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" aria-label="Taxa da região" placeholder="Taxa" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
        <button type="submit" className="btn-primary" disabled={busy}>
          Adicionar
        </button>
      </form>
      <div className="mb-3 space-y-2">
        {error && <Alert kind="error">{error}</Alert>}
        {success && <Alert kind="success">{success}</Alert>}
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-warmgray">Nenhuma região cadastrada. Sem regiões, a taxa fica “a ser informada pelo restaurante”.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {sorted.map((z) => (
            <li key={z.id} className="flex flex-wrap items-center gap-3 p-3">
              <span className="flex-1 font-semibold">{z.name}</span>
              <span className="tabular-nums">{formatBRL(z.feeCents)}</span>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={z.active} disabled={busy} label={`Região ${z.name} ativa`} onChange={(v) => save(z.id, { ...z, active: v }, v ? "Região ativada." : "Região desativada.")} />
                Ativa
              </label>
              <ConfirmButton
                onConfirm={() =>
                  run(async () => {
                    await repo.deleteZone(z.id);
                    await reload();
                  }, "Região excluída.")
                }
              >
                Excluir
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
