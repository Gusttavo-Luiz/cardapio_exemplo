import { MinusIcon, PlusIcon, TrashIcon } from "../ui/icons";

interface QuantityStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  name: string;
  labelledBy?: string;
  /** No carrinho, diminuir a partir de 1 remove o item. */
  removable?: boolean;
  size?: "md" | "sm";
}

export function QuantityStepper({ value, min, max, onChange, name, labelledBy, removable, size = "md" }: QuantityStepperProps) {
  const box = size === "md" ? "h-12 w-12" : "h-10 w-10";
  const atMin = value <= min;
  return (
    <div className="inline-flex items-center rounded-full border border-brown/15 bg-white" role="group" aria-labelledby={labelledBy}>
      <button
        type="button"
        className={`grid ${box} place-items-center rounded-full hover:bg-brown/5 disabled:opacity-40`}
        onClick={() => onChange(value - 1)}
        disabled={atMin && !removable}
        aria-label={atMin && removable ? `Remover ${name}` : `Diminuir quantidade de ${name}`}
      >
        {atMin && removable ? <TrashIcon width={18} height={18} /> : <MinusIcon width={18} height={18} />}
      </button>
      <span className="min-w-8 text-center font-semibold tabular-nums" aria-live="polite" aria-label={`Quantidade: ${value}`}>
        {value}
      </span>
      <button
        type="button"
        className={`grid ${box} place-items-center rounded-full hover:bg-brown/5 disabled:opacity-40`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Aumentar quantidade de ${name}`}
      >
        <PlusIcon width={18} height={18} />
      </button>
    </div>
  );
}
