import { BagIcon } from "../ui/icons";

interface HeaderProps {
  name: string;
  tagline: string;
  count: number;
  onOpenCart: () => void;
}

export function Header({ name, tagline, count, onOpenCart }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <a href="#inicio" className="min-w-0 flex-1 leading-tight" aria-label={`${name}, voltar ao início`}>
          <span className="block truncate font-serif text-lg font-semibold sm:text-xl">{name}</span>
          {tagline && <span className="block truncate text-xs text-warmgray sm:text-sm">{tagline}</span>}
        </a>
        <nav aria-label="Seções" className="hidden items-center gap-1 text-sm font-medium md:flex">
          <a className="rounded-full px-3 py-2 hover:bg-brown/5" href="#cardapio">Cardápio</a>
          <a className="rounded-full px-3 py-2 hover:bg-brown/5" href="#informacoes">Informações</a>
        </nav>
        <button
          type="button"
          onClick={onOpenCart}
          className="relative inline-flex h-12 items-center gap-2 rounded-full bg-brown px-4 font-semibold text-cream hover:bg-brown/90"
          aria-label={count > 0 ? `Abrir pedido, ${count} ${count === 1 ? "item" : "itens"}` : "Abrir pedido, vazio"}
        >
          <BagIcon />
          <span className="hidden sm:inline">Pedido</span>
          <span
            aria-hidden="true"
            className={`min-w-6 rounded-full px-1.5 text-center text-sm leading-6 ${count > 0 ? "bg-terracotta text-white" : "bg-cream/20"}`}
          >
            {count}
          </span>
        </button>
      </div>
    </header>
  );
}
