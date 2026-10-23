import { useState } from "react";
import type { Product, ProductOption } from "../data/types";
import { MAX_NOTES, MAX_QUANTITY } from "../lib/cart";
import { formatBRL } from "../lib/money";
import { Dialog } from "../ui/Dialog";
import { CloseIcon } from "../ui/icons";
import { ProductImage } from "../ui/ProductImage";
import { QuantityStepper } from "./QuantityStepper";

interface ProductDialogProps {
  product: Product | null;
  demo: boolean;
  onClose: () => void;
  onAdd: (product: Product, option: ProductOption | null, quantity: number, notes: string) => void;
}

export function ProductDialog({ product, demo, onClose, onAdd }: ProductDialogProps) {
  return (
    <Dialog open={product !== null} onClose={onClose} labelledBy="produto-titulo">
      {product && <ProductForm key={product.id} product={product} demo={demo} onClose={onClose} onAdd={onAdd} />}
    </Dialog>
  );
}

function ProductForm({ product, demo, onClose, onAdd }: ProductDialogProps & { product: Product }) {
  const [optionId, setOptionId] = useState<string | null>(product.options.length === 1 ? product.options[0]!.id : null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const option = product.options.find((o) => o.id === optionId) ?? null;
  const unit = option ? option.priceCents : product.priceCents;
  const needsOption = product.options.length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product.available) return;
    if (needsOption && !option) {
      setError("Escolha uma opção.");
      return;
    }
    onAdd(product, option, quantity, notes);
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative">
          <ProductImage product={product} priority className="aspect-[4/3] w-full" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-brown shadow"
            aria-label="Fechar"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            {demo && <span className="chip mb-2 bg-amber-100 text-amber-900">Conteúdo de teste</span>}
            <h2 id="produto-titulo" className="text-2xl font-semibold">
              {product.name}
            </h2>
            {product.description && <p className="mt-2 whitespace-pre-line text-warmgray">{product.description}</p>}
            {!needsOption && <p className="mt-3 text-lg font-semibold text-terracotta-ink">{formatBRL(product.priceCents)}</p>}
            {!product.available && (
              <p className="mt-3 rounded-xl bg-brown/5 px-3 py-2 font-medium" role="status">
                Este prato está indisponível no momento.
              </p>
            )}
          </div>

          {product.available && needsOption && (
            <fieldset>
              <legend className="label">
                Escolha uma opção <span className="font-normal text-warmgray">(obrigatório)</span>
              </legend>
              <div className="space-y-2">
                {product.options.map((o) => (
                  <label
                    key={o.id}
                    className={`flex min-h-12 items-center gap-3 rounded-xl border bg-white px-4 py-2 ${
                      optionId === o.id ? "border-olive ring-2 ring-olive/30" : "border-brown/15"
                    }`}
                  >
                    <input
                      type="radio"
                      name="opcao"
                      value={o.id}
                      checked={optionId === o.id}
                      onChange={() => {
                        setOptionId(o.id);
                        setError("");
                      }}
                      className="h-5 w-5 accent-olive"
                    />
                    <span className="flex-1">{o.label}</span>
                    <span className="font-semibold text-terracotta-ink">{formatBRL(o.priceCents)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {product.available && (
          <>
          <div>
            <span className="label" id="qtd-label">
              Quantidade
            </span>
            <QuantityStepper value={quantity} min={1} max={MAX_QUANTITY} onChange={setQuantity} labelledBy="qtd-label" name={product.name} />
          </div>

          <div>
            <label htmlFor="obs" className="label">
              Observações <span className="font-normal text-warmgray">(opcional)</span>
            </label>
            <textarea
              id="obs"
              rows={2}
              maxLength={MAX_NOTES}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Algum pedido para o restaurante?"
              className="field resize-none"
              aria-describedby="obs-ajuda"
            />
            <p id="obs-ajuda" className="mt-1 text-xs text-warmgray">
              O restaurante vai avaliar a sua solicitação; nem toda alteração é possível.
            </p>
          </div>
          </>
          )}
        </div>
      </div>
      <div className="border-t border-line bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {error && (
          <p className="mb-2 text-sm font-medium text-terracotta-ink" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={!product.available}>
          {product.available ? (
            <>
              Adicionar ao pedido
              {(!needsOption || option) && <span className="font-normal opacity-90">· {formatBRL(unit * quantity)}</span>}
            </>
          ) : (
            "Indisponível"
          )}
        </button>
      </div>
    </form>
  );
}
