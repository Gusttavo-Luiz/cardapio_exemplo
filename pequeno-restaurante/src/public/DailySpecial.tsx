import type { Product } from "../data/types";
import { StarIcon } from "../ui/icons";
import { ProductImage } from "../ui/ProductImage";
import { priceLabel } from "./format";

interface DailySpecialProps {
  product: Product;
  demo: boolean;
  onOpen: (product: Product) => void;
}

export function DailySpecial({ product, demo, onOpen }: DailySpecialProps) {
  const unavailable = !product.available;
  return (
    <section aria-labelledby="prato-do-dia" className="mx-auto max-w-6xl px-4 pt-8">
      <div className="grid overflow-hidden rounded-3xl border border-line bg-white md:grid-cols-2">
        <ProductImage product={product} priority className={`aspect-[16/10] md:aspect-auto md:h-full ${unavailable ? "grayscale" : ""}`} />
        <div className="flex flex-col p-5 sm:p-8">
          <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold tracking-wide text-olive-ink uppercase">
            <StarIcon width={16} height={16} /> Prato do dia
          </p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {demo && <span className="chip bg-amber-100 text-amber-900">Conteúdo de teste</span>}
            {!product.published && <span className="chip bg-brown text-cream">Não publicado</span>}
          </div>
          <h2 id="prato-do-dia" className="text-2xl font-semibold sm:text-3xl">
            {product.name}
          </h2>
          {product.description && <p className="mt-2 text-warmgray">{product.description}</p>}
          <p className="mt-4 text-xl font-semibold text-terracotta-ink">{priceLabel(product)}</p>
          <p className={`mt-1 text-sm font-medium ${unavailable ? "text-brown" : "text-olive-ink"}`}>
            {unavailable ? "Esgotado no momento" : "Disponível hoje"}
          </p>
          <div className="mt-5">
            <button type="button" className="btn-primary w-full sm:w-auto" disabled={unavailable} onClick={() => onOpen(product)}>
              {unavailable ? "Indisponível" : "Adicionar ao pedido"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
