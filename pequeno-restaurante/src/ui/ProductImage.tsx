import { useState } from "react";
import type { Product } from "../data/types";
import { PlateIcon } from "./icons";

interface ProductImageProps {
  product: Pick<Product, "name" | "imageUrl" | "imageIsPlaceholder">;
  className?: string;
  /** Imagens no topo da página carregam antes; as demais só quando aparecem na tela. */
  priority?: boolean;
  /** Miniatura: sem textos sobre a imagem. */
  compact?: boolean;
}

export function ProductImage({ product, className = "", priority = false, compact = false }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = product.imageUrl && !failed;
  return (
    <div className={`relative overflow-hidden bg-cream-deep ${className}`}>
      {showImage ? (
        <img
          src={product.imageUrl!}
          alt={product.imageIsPlaceholder ? `Imagem ilustrativa de ${product.name}` : product.name}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          width={800}
          height={600}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-warmgray" role="img" aria-label="Foto em breve">
          <PlateIcon width={32} height={32} strokeWidth={1.5} />
          {!compact && <span className="text-xs font-medium">Foto em breve</span>}
        </div>
      )}
      {showImage && product.imageIsPlaceholder && !compact && (
        <span className="chip absolute bottom-2 left-2 bg-white/90 text-warmgray">Imagem ilustrativa</span>
      )}
    </div>
  );
}
