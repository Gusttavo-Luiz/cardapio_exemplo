import { useState, type ReactNode } from "react";

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-olive" : "bg-brown/25"}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export function Checkbox({ checked, onChange, children, id }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; id?: string }) {
  return (
    <label className="flex min-h-11 items-start gap-3 py-1" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-olive" />
      <span className="text-sm">{children}</span>
    </label>
  );
}

/** Caixa "Informação confirmada pelo proprietário". */
export function ConfirmBox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  return (
    <div className={`mt-3 rounded-xl px-3 py-1 ${checked ? "bg-olive/10" : "bg-amber-50 ring-1 ring-amber-200"}`}>
      <Checkbox checked={checked} onChange={onChange}>
        <strong>{children ?? "Informação confirmada pelo restaurante"}</strong>
        {!checked && <span className="block text-amber-900">Enquanto não for confirmada, aparece no site com o aviso “a confirmar”.</span>}
      </Checkbox>
    </div>
  );
}

export function Panel({ title, description, actions, children }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-warmgray">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Alert({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "bg-terracotta/10 text-terracotta-ink",
    success: "bg-olive/10 text-olive-ink",
    info: "bg-amber-50 text-amber-950 ring-1 ring-amber-200",
  }[kind];
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-xl px-3 py-2 text-sm font-medium ${styles}`}>
      {children}
    </p>
  );
}

/** Botão que pede uma segunda confirmação antes de uma ação destrutiva. */
export function ConfirmButton({ onConfirm, children, confirmLabel = "Confirmar exclusão", className = "" }: { onConfirm: () => void; children: ReactNode; confirmLabel?: string; className?: string }) {
  const [asking, setAsking] = useState(false);
  if (asking) {
    return (
      <span className="inline-flex gap-1">
        <button type="button" className="rounded-full bg-terracotta px-3 py-2 text-sm font-semibold text-white" onClick={() => { setAsking(false); onConfirm(); }}>
          {confirmLabel}
        </button>
        <button type="button" className="rounded-full px-3 py-2 text-sm" onClick={() => setAsking(false)}>
          Cancelar
        </button>
      </span>
    );
  }
  return (
    <button type="button" className={`rounded-full px-3 py-2 text-sm font-medium text-terracotta-ink hover:bg-terracotta/10 ${className}`} onClick={() => setAsking(true)}>
      {children}
    </button>
  );
}

/** Executa uma ação assíncrona guardando o estado de carregamento e a mensagem de erro. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function run(action: () => Promise<void>, successMessage = ""): Promise<boolean> {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await action();
      setSuccess(successMessage);
      if (successMessage) setTimeout(() => setSuccess(""), 3000);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado. Tente de novo.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, success, run, setError };
}
