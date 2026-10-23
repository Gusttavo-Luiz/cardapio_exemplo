import type { Product } from "../data/types";
import { PlusIcon } from "../ui/icons";
import { ProductImage } from "../ui/ProductImage";
import { priceLabel } from "./format";

interface ProductCardProps {
  product: Product;
  demo: boolean;
  onOpen: (product: Product) => void;
}

export function ProductCard({ product, demo, onOpen }: ProductCardProps) {
  const unavailable = !product.available;
  return (
    <article
      className="flex overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(61_42_32/0.04)]"
    >
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="w-28 shrink-0 sm:w-40"
        aria-label={`Ver detalhes de ${product.name}`}
        tabIndex={-1}
      >
        <ProductImage product={product} className={`h-full min-h-28 sm:min-h-36 ${unavailable ? "grayscale" : ""}`} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <div className="mb-1 flex flex-wrap gap-1.5">
          {demo && <span className="chip bg-amber-100 text-amber-900">Conteúdo de teste</span>}
          {!product.published && <span className="chip bg-brown text-cream">Não publicado</span>}
          {unavailable && <span className="chip bg-brown/10 text-brown">Indisponível no momento</span>}
        </div>
        <h3 className="font-serif text-lg leading-snug font-semibold">
          <button type="button" onClick={() => onOpen(product)} className="text-left hover:underline">
            {product.name}
          </button>
        </h3>
        {product.description && <p className="mt-1 line-clamp-2 text-sm text-warmgray">{product.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="font-semibold text-terracotta-ink">{priceLabel(product)}</span>
          <button
            type="button"
            onClick={() => onOpen(product)}
            disabled={unavailable}
            className="btn-primary min-h-11 px-4 text-sm"
            aria-label={unavailable ? `${product.name} indisponível` : `Adicionar ${product.name} ao pedido`}
          >
            {unavailable ? "Indisponível" : (
              <>
                <PlusIcon width={18} height={18} /> Adicionar
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
