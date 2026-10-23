import { useEffect, useReducer } from "react";
import { cartReducer, loadCart, saveCart, type CartLine } from "../lib/cart";

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Carrinho guardado no navegador por algumas horas, para sobreviver a uma atualização da página. */
export function useCart() {
  const [lines, dispatch] = useReducer(cartReducer, undefined, (): CartLine[] => loadCart(storage()));
  useEffect(() => saveCart(storage(), lines), [lines]);
  return { lines, dispatch };
}
