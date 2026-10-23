import { useState, type ReactNode } from "react";
import type { AdminRepository } from "../data/repository";
import type { MenuData, OpeningHours, Settings } from "../data/types";
import { WEEKDAYS } from "../lib/restaurantInfo";
import { toWhatsappNumber } from "../lib/text";
import { firstError, settingsSchema } from "../lib/validation";
import { TrashIcon } from "../ui/icons";
import { prepareImage } from "./image";
import { Alert, Checkbox, ConfirmBox, Panel, useAction } from "./ui";

const COMMON_PAYMENTS = ["Dinheiro", "Pix", "Cartão de débito", "Cartão de crédito", "Vale-refeição"];

interface Props {
  repo: AdminRepository;
  menu: MenuData;
  reload: () => Promise<void>;
}

export function SettingsPanel({ repo, menu, reload }: Props) {
  const [draft, setDraft] = useState<Settings>(menu.settings);
  const [customPayment, setCustomPayment] = useState("");
  const [uploading, setUploading] = useState(false);
  const { busy, error, success, run, setError } = useAction();
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const dirty = stableJson(draft) !== stableJson(menu.settings);

  function setHours(index: number, patch: Partial<OpeningHours>) {
    set("hours", draft.hours.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }

  function togglePayment(method: string, on: boolean) {
    set("paymentMethods", on ? [...draft.paymentMethods, method] : draft.paymentMethods.filter((m) => m !== method));
  }

  async function uploadHero(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await repo.uploadImage(await prepareImage(file, 1800), "capa");
      setDraft((d) => ({ ...d, heroImageUrl: url, heroImageIsPlaceholder: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = settingsSchema.safeParse(draft);
    if (!parsed.success) return setError(firstError(parsed.error));
    // Mantém o prato do dia atual: ele é escolhido na aba Pratos e pode ter mudado nesse meio-tempo.
    const saved = { ...parsed.data, dailyProductId: menu.settings.dailyProductId } as Settings;
    run(async () => {
      await repo.saveSettings(saved);
      setDraft(saved);
      await reload();
    }, "Informações salvas.");
  }

  const waNumber = toWhatsappNumber(draft.whatsapp);

  return (
    <form onSubmit={submit} className="space-y-4">
      <Panel title="Identidade e capa" description="Nome e textos que aparecem no topo do cardápio.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do restaurante" id="s-nome">
            <input id="s-nome" className="field" required maxLength={80} value={draft.restaurantName} onChange={(e) => set("restaurantName", e.target.value)} />
          </Field>
          <Field label="Frase de apresentação" id="s-frase">
            <input id="s-frase" className="field" maxLength={120} value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="Título da capa" id="s-titulo">
            <input id="s-titulo" className="field" required maxLength={120} value={draft.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} />
          </Field>
          <Field label="Texto de apoio da capa" id="s-apoio">
            <input id="s-apoio" className="field" maxLength={200} value={draft.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <span className="label">Foto da capa</span>
          <div className="flex flex-wrap items-center gap-3">
            {draft.heroImageUrl ? (
              <img src={draft.heroImageUrl} alt="Foto da capa atual" className="h-24 w-36 rounded-xl object-cover" />
            ) : (
              <span className="text-sm text-warmgray">Sem foto: a capa mostra um desenho simples.</span>
            )}
            <label className="btn-secondary min-h-10 text-sm">
              {uploading ? "Enviando…" : draft.heroImageUrl ? "Trocar foto" : "Enviar foto"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => uploadHero(e.target.files?.[0])} />
            </label>
            {draft.heroImageUrl && (
              <button type="button" className="text-sm text-terracotta-ink underline" onClick={() => set("heroImageUrl", null)}>
                Remover
              </button>
            )}
          </div>
          {draft.heroImageUrl && (
            <Checkbox checked={draft.heroImageIsPlaceholder} onChange={(v) => set("heroImageIsPlaceholder", v)}>
              Imagem provisória ou ilustrativa (não é foto do restaurante). O site mostra o aviso “Imagem ilustrativa”.
            </Checkbox>
          )}
        </div>
      </Panel>

      <Panel title="Endereço">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rua e número" id="s-rua">
            <input id="s-rua" className="field" maxLength={160} value={draft.addressLine} onChange={(e) => set("addressLine", e.target.value)} />
          </Field>
          <Field label="Bairro" id="s-bairro">
            <input id="s-bairro" className="field" maxLength={80} value={draft.district} onChange={(e) => set("district", e.target.value)} />
          </Field>
          <Field label="Cidade" id="s-cidade">
            <input id="s-cidade" className="field" maxLength={80} value={draft.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <Field label="UF" id="s-uf">
              <input id="s-uf" className="field uppercase" maxLength={2} value={draft.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
            </Field>
            <Field label="CEP" id="s-cep">
              <input id="s-cep" className="field" inputMode="numeric" maxLength={9} value={draft.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="mt-4">
          <Field label="Link do Google Maps" id="s-maps">
            <input id="s-maps" className="field" type="url" maxLength={1000} value={draft.mapsUrl} onChange={(e) => set("mapsUrl", e.target.value)} />
          </Field>
        </div>
        <ConfirmBox checked={draft.addressConfirmed} onChange={(v) => set("addressConfirmed", v)} />
      </Panel>

      <Panel title="Contato">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Telefone" id="s-tel">
              <input id="s-tel" className="field" type="tel" maxLength={30} value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <ConfirmBox checked={draft.phoneConfirmed} onChange={(v) => set("phoneConfirmed", v)} />
          </div>
          <div>
            <Field label="Instagram" id="s-insta" hint="Somente o usuário, ex.: pequeno_restaurante">
              <input id="s-insta" className="field" maxLength={60} value={draft.instagram} onChange={(e) => set("instagram", e.target.value)} />
            </Field>
            <ConfirmBox checked={draft.instagramConfirmed} onChange={(v) => set("instagramConfirmed", v)} />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-line p-3">
          <Field label="WhatsApp para pedidos" id="s-wa" hint="Com DDD. O número recebe a mensagem montada pelo carrinho.">
            <input id="s-wa" className="field" type="tel" maxLength={30} value={draft.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          </Field>
          {draft.whatsapp && !waNumber && <p className="mt-1 text-sm text-terracotta-ink">Número inválido. Use o formato (11) 3315-9015.</p>}
          {waNumber && (
            <a className="mt-2 inline-block text-sm underline" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
              Testar este número no WhatsApp
            </a>
          )}
          <ConfirmBox checked={draft.whatsappConfirmed} onChange={(v) => set("whatsappConfirmed", v)}>
            Confirmo que este número recebe pedidos pelo WhatsApp (ativa o botão “Enviar pelo WhatsApp”)
          </ConfirmBox>
        </div>
      </Panel>

      <Panel title="Horário de funcionamento">
        <div className="space-y-3">
          {draft.hours.map((h, i) => (
            <div key={i} className="rounded-xl border border-line p-3">
              <fieldset>
                <legend className="mb-1 text-sm font-semibold">Dias</legend>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((name, d) => {
                    const on = h.days.includes(d);
                    return (
                      <label key={d} className={`inline-flex min-h-10 items-center rounded-full border px-3 text-sm font-medium ${on ? "border-olive bg-olive text-white" : "border-brown/15 bg-white"}`}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={on}
                          onChange={(e) => setHours(i, { days: e.target.checked ? [...h.days, d].sort((a, b) => a - b) : h.days.filter((x) => x !== d) })}
                        />
                        {name.slice(0, 3)}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <Field label="Abre" id={`h-abre-${i}`}>
                  <input id={`h-abre-${i}`} className="field w-32" type="time" value={h.opens} onChange={(e) => setHours(i, { opens: e.target.value })} />
                </Field>
                <Field label="Fecha" id={`h-fecha-${i}`}>
                  <input id={`h-fecha-${i}`} className="field w-32" type="time" value={h.closes} onChange={(e) => setHours(i, { closes: e.target.value })} />
                </Field>
                <button type="button" className="grid h-12 w-12 place-items-center rounded-full hover:bg-brown/5" aria-label="Remover horário" onClick={() => set("hours", draft.hours.filter((_, j) => j !== i))}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary min-h-10 text-sm" onClick={() => set("hours", [...draft.hours, { days: [], opens: "11:30", closes: "14:00" }])}>
            Adicionar horário
          </button>
        </div>
        <div className="mt-4">
          <Field label="Observação sobre o horário (opcional)" id="s-hnota" hint="Ex.: feriados, fechamento para férias.">
            <input id="s-hnota" className="field" maxLength={200} value={draft.hoursNote} onChange={(e) => set("hoursNote", e.target.value)} />
          </Field>
        </div>
        <ConfirmBox checked={draft.hoursConfirmed} onChange={(v) => set("hoursConfirmed", v)} />
      </Panel>

      <Panel title="Atendimento" description="Retirada e entrega só aparecem como opção no pedido depois de confirmadas.">
        <div className="grid gap-1 sm:grid-cols-3">
          <Checkbox checked={draft.dineIn} onChange={(v) => set("dineIn", v)}>
            Consumo no local
          </Checkbox>
          <Checkbox checked={draft.pickup} onChange={(v) => set("pickup", v)}>
            Retirada
          </Checkbox>
          <Checkbox checked={draft.delivery} onChange={(v) => set("delivery", v)}>
            Entrega
          </Checkbox>
        </div>
        <ConfirmBox checked={draft.servicesConfirmed} onChange={(v) => set("servicesConfirmed", v)} />
      </Panel>

      <Panel title="Formas de pagamento">
        <div className="grid gap-1 sm:grid-cols-3">
          {[...new Set([...COMMON_PAYMENTS, ...draft.paymentMethods])].map((m) => (
            <Checkbox key={m} checked={draft.paymentMethods.includes(m)} onChange={(v) => togglePayment(m, v)}>
              {m}
            </Checkbox>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <label htmlFor="s-pag" className="sr-only">
            Outra forma de pagamento
          </label>
          <input id="s-pag" className="field" placeholder="Outra forma (ex.: Ticket)" maxLength={40} value={customPayment} onChange={(e) => setCustomPayment(e.target.value)} />
          <button
            type="button"
            className="btn-secondary"
            disabled={!customPayment.trim()}
            onClick={() => {
              if (!draft.paymentMethods.includes(customPayment.trim())) togglePayment(customPayment.trim(), true);
              setCustomPayment("");
            }}
          >
            Adicionar
          </button>
        </div>
        <ConfirmBox checked={draft.paymentsConfirmed} onChange={(v) => set("paymentsConfirmed", v)} />
      </Panel>

      <Panel title="Privacidade" description="Aparece na política de privacidade e no rodapé (Lei Geral de Proteção de Dados).">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Responsável pelos dados" id="s-resp" hint="Razão social ou nome do responsável, e CNPJ se houver.">
            <input id="s-resp" className="field" maxLength={160} value={draft.privacyController} onChange={(e) => set("privacyController", e.target.value)} />
          </Field>
          <Field label="Contato para assuntos de privacidade" id="s-contato" hint="E-mail ou telefone.">
            <input id="s-contato" className="field" maxLength={160} value={draft.privacyContact} onChange={(e) => set("privacyContact", e.target.value)} />
          </Field>
        </div>
      </Panel>

      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur">
        {error && <Alert kind="error">{error}</Alert>}
        {success && <Alert kind="success">{success}</Alert>}
        <div className="flex items-center justify-end gap-3">
          {dirty && <span className="text-sm text-warmgray">Alterações não salvas</span>}
          <button type="button" className="btn-ghost" disabled={!dirty || busy} onClick={() => setDraft(menu.settings)}>
            Descartar
          </button>
          <button type="submit" className="btn-primary" disabled={!dirty || busy || uploading}>
            {busy ? "Salvando…" : "Salvar informações"}
          </button>
        </div>
      </div>
    </form>
  );
}

/** JSON com as chaves em ordem alfabética, para comparar objetos vindos de fontes diferentes. */
function stableJson(value: object): string {
  return JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  );
}

export function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-warmgray">{hint}</p>}
    </div>
  );
}
