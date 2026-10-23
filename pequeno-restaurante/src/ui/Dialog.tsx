import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** id do título, para leitores de tela anunciarem a janela. */
  labelledBy: string;
  children: ReactNode;
  /** "sheet": sobe da parte de baixo no celular e fica à direita no computador. */
  variant?: "center" | "sheet";
}

// Usa o <dialog> nativo: o navegador cuida do foco, da tecla Esc e de bloquear o fundo.
export function Dialog({ open, onClose, labelledBy, children, variant = "center" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const position =
    variant === "sheet"
      ? "mt-auto mb-0 w-full max-w-none rounded-t-3xl sm:my-0 sm:mr-0 sm:ml-auto sm:h-full sm:max-h-none sm:w-[28rem] sm:rounded-none sm:rounded-l-3xl"
      : "m-auto w-[calc(100%-1.5rem)] max-w-lg rounded-3xl";

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`max-h-[92dvh] overflow-hidden bg-cream p-0 text-brown shadow-2xl ${position}`}
    >
      {open && <div className="flex max-h-[inherit] flex-col sm:h-full">{children}</div>}
    </dialog>
  );
}
