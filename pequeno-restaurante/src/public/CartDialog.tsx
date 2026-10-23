import { useEffect, useMemo, useState } from "react";
import type { DeliveryZone, Settings } from "../data/types";
import { blockingIssues, cartCount, lineTotal, MAX_NOTES, MAX_QUANTITY, type CartAction, type CartLine, type LineIssue } from "../lib/cart";
import { formatBRL } from "../lib/money";
import {
  activeZones,
  availableModes,
  buildOrderMessage,
  emptyCheckout,
  MAX_ADDRESS,
  MAX_SHORT_FIELD,
  modeLabel,
  orderTotals,
  validateCheckout,
  whatsappLink,
  type CheckoutDetails,
} from "../lib/order";
import { Dialog } from "../ui/Dialog";
import { ArrowLeftIcon, BagIcon, CloseIcon, WhatsappIcon } from "../ui/icons";
import { pluralItems } from "./format";
import { QuantityStepper } from "./QuantityStepper";

/** Depois deste tempo, o cardápio é conferido de novo antes de abrir o WhatsApp. */
const REVALIDATE_AFTER_MS = 2 * 60 * 1000;

interface CartDialogProps {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  dispatch: (action: CartAction) => void;
  issues: LineIssue[];
  settings: Settings;
  zones: DeliveryZone[];
  demo: boolean;
  /** Recarrega o cardápio e confere preços e disponibilidade do carrinho. */
  onRevalidate: () => Promise<LineIssue[]>;
}

type Step = "cart" | "checkout" | "sent";

export function CartDialog(props: CartDialogProps) {
  const { open, onClose, lines, dispatch, issues, settings, zones, demo, onRevalidate } = props;
  const [step, setStep] = useState<Step>("cart");
  const [details, setDetails] = useState<CheckoutDetails>(emptyCheckout);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [checkedAt, setCheckedAt] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  // Com uma única modalidade disponível, ela já vem escolhida.
  const onlyMode = availableModes(settings).length === 1 ? availableModes(settings)[0]! : null;
  useEffect(() => {
    if (onlyMode && details.mode !== onlyMode) setDetails((d) => ({ ...d, mode: onlyMode }));
  }, [onlyMode, details.mode]);

  useEffect(() => {
    if (!open) {
      if (step === "sent") setStep("cart");
      setNotice("");
      setCheckError("");
    }
  }, [open, step]);

  useEffect(() => {
    if (lines.length === 0 && step === "checkout") setStep("cart");
  }, [lines.length, step]);

  const blocking = blockingIssues(issues);
  const totals = orderTotals(lines, settings, zones, details);
  const message = useMemo(() => buildOrderMessage(lines, settings, zones, details), [lines, settings, zones, details]);
  const link = demo ? null : whatsappLink(settings, message);

  /** Confere o carrinho com o cardápio atual do servidor. */
  async function revalidate(): Promise<"ok" | "changed" | "blocked" | "error"> {
    setChecking(true);
    setCheckError("");
    try {
      const found = await onRevalidate();
      setCheckedAt(Date.now());
      if (blockingIssues(found).length > 0) {
        setStep("cart");
        return "blocked";
      }
      if (found.some((i) => i.kind === "priceChanged")) {
        setNotice("Alguns preços mudaram desde que você adicionou os itens. Os valores já estão atualizados.");
        return "changed";
      }
      return "ok";
    } catch {
      setCheckError("Não conseguimos conferir o cardápio agora. Verifique a conexão e tente de novo.");
      return "error";
    } finally {
      setChecking(false);
    }
  }

  async function goToCheckout() {
    setNotice("");
    const result = await revalidate();
    if (result === "ok" || result === "changed") setStep("checkout");
  }

  async function onSend(e: React.MouseEvent<HTMLAnchorElement>) {
    const problems = validateCheckout(lines, settings, zones, details);
    setErrors(problems);
    if (problems.length > 0) {
      e.preventDefault();
      return;
    }
    if (Date.now() - checkedAt > REVALIDATE_AFTER_MS) {
      // Conferir de novo exige uma ida ao servidor; depois o cliente toca em enviar mais uma vez.
      e.preventDefault();
      if ((await revalidate()) === "ok") setNotice("Cardápio conferido. Toque em “Enviar pelo WhatsApp” para continuar.");
      return;
    }
    setStep("sent");
  }

  const title = step === "cart" ? "Seu pedido" : step === "checkout" ? "Finalizar pedido" : "Quase lá!";

  return (
    <Dialog open={open} onClose={onClose} labelledBy="carrinho-titulo" variant="sheet">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        {step === "checkout" && (
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-brown/5" onClick={() => setStep("cart")} aria-label="Voltar para os itens">
            <ArrowLeftIcon />
          </button>
        )}
        <h2 id="carrinho-titulo" className="flex-1 text-xl font-semibold">
          {title}
        </h2>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-brown/5" onClick={onClose} aria-label="Fechar pedido">
          <CloseIcon />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {(notice || checkError) && (
          <p role="status" className={`mb-4 rounded-xl px-3 py-2 text-sm font-medium ${checkError ? "bg-terracotta/10 text-terracotta-ink" : "bg-olive/10 text-olive-ink"}`}>
            {checkError || notice}
          </p>
        )}
        {step === "cart" && <CartStep lines={lines} dispatch={dispatch} issues={issues} />}
        {step === "checkout" && (
          <CheckoutStep details={details} setDetails={setDetails} settings={settings} zones={zones} errors={errors} message={message} demo={demo} hasLink={link !== null} />
        )}
        {step === "sent" && <SentStep />}
      </div>

      {lines.length > 0 && (
        <div className="border-t border-line bg-cream px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Totals totals={totals} delivery={details.mode === "delivery"} showFee={step !== "cart"} />
          {step === "cart" && (
            <>
              {blocking.length > 0 && (
                <p className="mb-2 text-sm font-medium text-terracotta-ink" role="alert">
                  Remova os itens indisponíveis para continuar.
                </p>
              )}
              <button type="button" className="btn-primary w-full" disabled={blocking.length > 0 || checking} onClick={goToCheckout}>
                {checking ? "Conferindo o cardápio…" : "Continuar"}
              </button>
            </>
          )}
          {step === "checkout" && (
            <>
              {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" onClick={onSend} className={`btn-primary w-full ${checking ? "pointer-events-none opacity-60" : ""}`} aria-disabled={checking}>
                  <WhatsappIcon /> {checking ? "Conferindo o cardápio…" : "Enviar pelo WhatsApp"}
                </a>
              ) : (
                <button type="button" className="btn-primary w-full" disabled>
                  <WhatsappIcon /> Enviar pelo WhatsApp
                </button>
              )}
              <p className="mt-2 text-center text-xs text-warmgray">O pedido só é confirmado depois da resposta do restaurante.</p>
            </>
          )}
          {step === "sent" && (
            <div className="grid gap-2">
              {link && (
                <a href={link} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
                  <WhatsappIcon /> Abrir o WhatsApp de novo
                </a>
              )}
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={() => {
                  dispatch({ type: "clear" });
                  setDetails(emptyCheckout);
                  setStep("cart");
                  onClose();
                }}
              >
                Já enviei — limpar o carrinho
              </button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

function CartStep({ lines, dispatch, issues }: { lines: CartLine[]; dispatch: (a: CartAction) => void; issues: LineIssue[] }) {
  const [confirmClear, setConfirmClear] = useState(false);
  if (lines.length === 0) {
    return (
      <div className="py-12 text-center">
        <BagIcon width={40} height={40} className="mx-auto text-warmgray" strokeWidth={1.5} />
        <p className="mt-3 font-serif text-xl font-semibold">Seu pedido está vazio</p>
        <p className="mt-1 text-warmgray">Escolha os pratos no cardápio e toque em “Adicionar”.</p>
      </div>
    );
  }
  const issueFor = (id: string) => issues.find((i) => i.lineId === id);
  return (
    <div>
      <p className="mb-3 text-sm text-warmgray">{pluralItems(cartCount(lines))}</p>
      <ul className="space-y-3">
        {lines.map((line) => {
          const issue = issueFor(line.id);
          const blocked = issue && issue.kind !== "priceChanged";
          return (
            <li key={line.id} className={`rounded-2xl border bg-white p-3 ${blocked ? "border-terracotta/50" : "border-line"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{line.name}</p>
                  {line.optionLabel && <p className="text-sm text-warmgray">{line.optionLabel}</p>}
                  <p className="text-sm text-warmgray">{formatBRL(line.unitPriceCents)} cada</p>
                </div>
                <p className="font-semibold whitespace-nowrap text-terracotta-ink">{formatBRL(lineTotal(line))}</p>
              </div>
              {issue && (
                <p role="alert" className={`mt-2 rounded-lg px-2.5 py-1.5 text-sm font-medium ${blocked ? "bg-terracotta/10 text-terracotta-ink" : "bg-olive/10 text-olive-ink"}`}>
                  {issue.kind === "missing" && "Este item saiu do cardápio. Remova-o para continuar."}
                  {issue.kind === "unavailable" && "Este item ficou indisponível. Remova-o para continuar."}
                  {issue.kind === "priceChanged" && `O preço mudou de ${formatBRL(issue.fromCents)} para ${formatBRL(issue.toCents)}.`}
                </p>
              )}
              <label className="mt-2 block">
                <span className="sr-only">Observações para {line.name}</span>
                <input
                  type="text"
                  value={line.notes}
                  maxLength={MAX_NOTES}
                  onChange={(e) => dispatch({ type: "setNotes", lineId: line.id, notes: e.target.value })}
                  placeholder="Observação (opcional)"
                  className="field py-2 text-sm"
                />
              </label>
              <div className="mt-2 flex items-center justify-between">
                <QuantityStepper
                  size="sm"
                  value={line.quantity}
                  min={1}
                  max={MAX_QUANTITY}
                  removable
                  name={line.name}
                  onChange={(n) => dispatch({ type: "setQuantity", lineId: line.id, quantity: n })}
                />
                <button type="button" className="rounded-full px-3 py-2 text-sm font-medium text-warmgray underline-offset-2 hover:underline" onClick={() => dispatch({ type: "remove", lineId: line.id })}>
                  Remover
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 text-center">
        {confirmClear ? (
          <div className="rounded-2xl bg-white p-3 ring-1 ring-line" role="group" aria-label="Confirmar limpeza">
            <p className="text-sm font-medium">Remover todos os itens do pedido?</p>
            <div className="mt-2 flex justify-center gap-2">
              <button type="button" className="btn-secondary min-h-10 text-sm" onClick={() => setConfirmClear(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary min-h-10 text-sm" onClick={() => dispatch({ type: "clear" })}>
                Limpar carrinho
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="text-sm font-medium text-warmgray underline underline-offset-2" onClick={() => setConfirmClear(true)}>
            Limpar carrinho
          </button>
        )}
      </div>
    </div>
  );
}

interface CheckoutStepProps {
  details: CheckoutDetails;
  setDetails: React.Dispatch<React.SetStateAction<CheckoutDetails>>;
  settings: Settings;
  zones: DeliveryZone[];
  errors: string[];
  message: string;
  demo: boolean;
  hasLink: boolean;
}

function CheckoutStep({ details, setDetails, settings, zones, errors, message, demo, hasLink }: CheckoutStepProps) {
  const modes = availableModes(settings);
  const zoneList = activeZones(zones);
  const payments = settings.paymentsConfirmed ? settings.paymentMethods : [];
  const set = <K extends keyof CheckoutDetails>(key: K, value: CheckoutDetails[K]) => setDetails((d) => ({ ...d, [key]: value }));
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-5">
      {!hasLink && (
        <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200" role="note">
          {demo ? (
            <p>
              <strong>Modo de demonstração:</strong> o envio pelo WhatsApp fica desativado até o cardápio real ser publicado. Você pode conferir a mensagem abaixo.
            </p>
          ) : (
            <p>
              Os pedidos pelo WhatsApp ainda não estão ativos.
              {settings.phone && settings.phoneConfirmed && ` Para pedir, ligue para ${settings.phone}.`}
            </p>
          )}
        </div>
      )}

      {modes.length > 1 && (
        <fieldset>
          <legend className="label">Entrega ou retirada?</legend>
          <div className="grid grid-cols-2 gap-2">
            {modes.map((m) => (
              <label key={m} className={`flex min-h-12 items-center gap-2 rounded-xl border bg-white px-3 ${details.mode === m ? "border-olive ring-2 ring-olive/30" : "border-brown/15"}`}>
                <input type="radio" name="modalidade" className="h-5 w-5 accent-olive" checked={details.mode === m} onChange={() => set("mode", m)} />
                <span className="text-sm font-medium">{modeLabel[m]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {modes.length === 1 && (
        <p className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line">
          Modalidade: <strong>{modeLabel[modes[0]!]}</strong>
        </p>
      )}

      {details.mode === "pickup" && settings.addressLine && (
        <p className="text-sm text-warmgray">
          Retirada em {settings.addressLine}
          {settings.district && `, ${settings.district}`}.
        </p>
      )}

      {details.mode === "delivery" && (
        <div className="space-y-3">
          <div>
            <label htmlFor="endereco" className="label">
              Endereço de entrega
            </label>
            <textarea
              id="endereco"
              rows={2}
              autoComplete="street-address"
              maxLength={MAX_ADDRESS}
              value={details.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Rua, número, complemento e bairro"
              className="field resize-none"
            />
          </div>
          <div>
            <label htmlFor="referencia" className="label">
              Ponto de referência <span className="font-normal text-warmgray">(opcional)</span>
            </label>
            <input id="referencia" type="text" maxLength={MAX_SHORT_FIELD} value={details.reference} onChange={(e) => set("reference", e.target.value)} className="field" />
          </div>
          {settings.deliveryFeeMode === "zones" && zoneList.length > 0 && (
            <div>
              <label htmlFor="regiao" className="label">
                Região de entrega
              </label>
              <select id="regiao" className="field" value={details.zoneId ?? ""} onChange={(e) => set("zoneId", e.target.value || null)}>
                <option value="">Selecione…</option>
                {zoneList.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — {formatBRL(z.feeCents)}
                  </option>
                ))}
                <option value="other">Outra região (taxa a confirmar)</option>
              </select>
            </div>
          )}
          <p className="text-xs text-warmgray">
            {settings.deliveryNote ||
              (settings.deliveryFeeMode === "none" ? "Se houver taxa de entrega, o restaurante informa na resposta." : "A entrega depende da confirmação do restaurante.")}
          </p>
        </div>
      )}

      {payments.length > 0 && (
        <div>
          <label htmlFor="pagamento" className="label">
            Forma de pagamento <span className="font-normal text-warmgray">(opcional)</span>
          </label>
          <select id="pagamento" className="field" value={details.payment ?? ""} onChange={(e) => set("payment", e.target.value || null)}>
            <option value="">Combinar com o restaurante</option>
            {payments.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="nome" className="label">
          Nome para o pedido <span className="font-normal text-warmgray">(opcional)</span>
        </label>
        <input id="nome" type="text" autoComplete="given-name" maxLength={MAX_SHORT_FIELD} value={details.customerName} onChange={(e) => set("customerName", e.target.value)} className="field" />
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 rounded-xl bg-terracotta/10 py-2 pr-3 pl-7 text-sm font-medium text-terracotta-ink">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <details className="rounded-2xl bg-white p-3 ring-1 ring-line" open={!hasLink}>
        <summary className="cursor-pointer text-sm font-semibold">Ver a mensagem que será enviada</summary>
        <pre className="mt-3 font-sans text-sm whitespace-pre-wrap text-brown" data-testid="mensagem-whatsapp">
          {message}
        </pre>
        <button type="button" className="btn-secondary mt-3 min-h-10 text-sm" onClick={copy}>
          {copied ? "Mensagem copiada" : "Copiar mensagem"}
        </button>
      </details>

      <p className="text-xs text-warmgray">
        Seus dados vão apenas na mensagem do WhatsApp e não ficam guardados neste site.{" "}
        <a href="./privacidade/" className="underline">
          Privacidade
        </a>
      </p>
    </div>
  );
}

function SentStep() {
  return (
    <div className="space-y-3 py-6 text-center" role="status">
      <WhatsappIcon width={44} height={44} className="mx-auto text-olive" strokeWidth={1.5} />
      <p className="font-serif text-xl font-semibold">Sua mensagem está pronta no WhatsApp</p>
      <p className="text-warmgray">
        Confira os itens e <strong className="text-brown">toque em enviar dentro do WhatsApp</strong>. Abrir o WhatsApp não envia a mensagem sozinho.
      </p>
      <p className="rounded-xl bg-white p-3 text-sm ring-1 ring-line">
        O pedido <strong>ainda não está confirmado</strong>. Ele só será confirmado quando o restaurante responder a sua mensagem.
      </p>
    </div>
  );
}

function Totals({ totals, delivery, showFee }: { totals: ReturnType<typeof orderTotals>; delivery: boolean; showFee: boolean }) {
  const pendingFee = showFee && delivery && totals.feeCents === null;
  return (
    <dl className="mb-3 space-y-1 text-sm">
      <div className="flex justify-between">
        <dt className="text-warmgray">Subtotal</dt>
        <dd className="font-medium tabular-nums">{formatBRL(totals.subtotalCents)}</dd>
      </div>
      {showFee && delivery && (
        <div className="flex justify-between">
          <dt className="text-warmgray">Taxa de entrega</dt>
          <dd className="font-medium tabular-nums">{totals.feeCents === null ? "a informar" : formatBRL(totals.feeCents)}</dd>
        </div>
      )}
      <div className="flex justify-between text-base">
        <dt className="font-semibold">{pendingFee ? "Total (sem entrega)" : "Total"}</dt>
        <dd className="font-semibold tabular-nums" data-testid="total">
          {formatBRL(showFee ? totals.totalCents : totals.subtotalCents)}
        </dd>
      </div>
    </dl>
  );
}
