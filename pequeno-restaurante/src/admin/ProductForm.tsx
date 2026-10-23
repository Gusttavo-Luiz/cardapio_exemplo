import { useState } from "react";
import type { AdminRepository, ProductInput } from "../data/repository";
import type { Category, Product } from "../data/types";
import { centsToInput, parseBRL } from "../lib/money";
import { firstError, productSchema } from "../lib/validation";
import { CloseIcon, TrashIcon } from "../ui/icons";
import { ProductImage } from "../ui/ProductImage";
import { prepareImage } from "./image";
import { Alert, Checkbox } from "./ui";

interface Props {
  repo: AdminRepository;
  product: Product | null;
  categories: Category[];
  nextPosition: number;
  onCancel: () => void;
  onSave: (id: string | null, input: ProductInput) => Promise<void>;
}

interface OptionDraft {
  id: string;
  label: string;
  price: string;
}

export function ProductForm({ repo, product, categories, nextPosition, onCancel, onSave }: Props) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(product?.categoryId ?? categories[0]?.id ?? null);
  const [price, setPrice] = useState(product ? centsToInput(product.priceCents) : "");
  const [options, setOptions] = useState<OptionDraft[]>(
    product?.options.map((o) => ({ id: o.id, label: o.label, price: centsToInput(o.priceCents) })) ?? [],
  );
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl ?? null);
  const [imageIsPlaceholder, setImageIsPlaceholder] = useState(product?.imageIsPlaceholder ?? false);
  const [available, setAvailable] = useState(product?.available ?? true);
  const [published, setPublished] = useState(product?.published ?? false);
  const [position, setPosition] = useState(String(product?.position ?? nextPosition));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const blob = await prepareImage(file);
      setImageUrl(await repo.uploadImage(blob, "pratos"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsedOptions = options.map((o) => ({ id: o.id, label: o.label, priceCents: parseBRL(o.price) }));
    if (parsedOptions.some((o) => o.priceCents === null)) return setError("Confira o preço de cada variação (ex.: 25,90).");
    const optionPrices = parsedOptions.map((o) => o.priceCents as number);
    // Com variações, o preço-base é o da variação mais barata (usado no "a partir de").
    const priceCents = options.length > 0 ? Math.min(...optionPrices) : parseBRL(price);
    if (priceCents === null) return setError("Informe o preço no formato 25,90.");
    const result = productSchema.safeParse({
      categoryId,
      name,
      description,
      priceCents,
      options: parsedOptions,
      imageUrl: imageUrl || null,
      imageIsPlaceholder: imageUrl ? imageIsPlaceholder : false,
      available,
      published,
      position: Number(position) || 0,
    });
    if (!result.success) return setError(firstError(result.error));
    setSaving(true);
    try {
      await onSave(product?.id ?? null, result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center border-b border-line px-4 py-3">
        <h2 id="form-prato-titulo" className="flex-1 text-xl font-semibold">
          {product ? "Editar prato" : "Novo prato"}
        </h2>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-brown/5" onClick={onCancel} aria-label="Fechar">
          <CloseIcon />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <label htmlFor="p-nome" className="label">
            Nome do prato
          </label>
          <input id="p-nome" className="field" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-desc" className="label">
            Descrição
          </label>
          <textarea id="p-desc" className="field" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
          <p className="mt-1 text-xs text-warmgray">Descreva o prato como ele é servido. Ingredientes e alergênicos só se forem confirmados pela cozinha.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-cat" className="label">
              Categoria
            </label>
            <select id="p-cat" className="field" value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value || null)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.active ? " (desativada)" : ""}
                </option>
              ))}
              <option value="">Sem categoria</option>
            </select>
          </div>
          {options.length === 0 && (
            <div>
              <label htmlFor="p-preco" className="label">
                Preço (R$)
              </label>
              <input id="p-preco" className="field" inputMode="decimal" placeholder="25,90" required value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          )}
        </div>

        <fieldset className="rounded-xl border border-line p-3">
          <legend className="px-1 text-sm font-semibold">Variações ou tamanhos (opcional)</legend>
          <p className="mb-2 text-xs text-warmgray">Use quando o mesmo prato tiver opções com preços diferentes, como “Marmita P” e “Marmita G”.</p>
          <ul className="space-y-2">
            {options.map((o, i) => (
              <li key={o.id} className="flex gap-2">
                <input
                  className="field flex-1"
                  aria-label={`Nome da variação ${i + 1}`}
                  placeholder="Nome"
                  maxLength={60}
                  value={o.label}
                  onChange={(e) => setOptions(options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  className="field w-28"
                  aria-label={`Preço da variação ${i + 1}`}
                  placeholder="0,00"
                  inputMode="decimal"
                  value={o.price}
                  onChange={(e) => setOptions(options.map((x) => (x.id === o.id ? { ...x, price: e.target.value } : x)))}
                />
                <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full hover:bg-brown/5" aria-label={`Remover variação ${i + 1}`} onClick={() => setOptions(options.filter((x) => x.id !== o.id))}>
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-secondary mt-2 min-h-10 text-sm"
            onClick={() => setOptions([...options, { id: Math.random().toString(36).slice(2, 10), label: "", price: options.length === 0 ? price : "" }])}
          >
            Adicionar variação
          </button>
        </fieldset>

        <div>
          <span className="label">Foto</span>
          <div className="flex items-start gap-3">
            <ProductImage product={{ name: name || "prato", imageUrl, imageIsPlaceholder }} className="h-24 w-32 shrink-0 rounded-xl" />
            <div className="space-y-2">
              <label className="btn-secondary min-h-10 cursor-pointer text-sm">
                {uploading ? "Enviando…" : imageUrl ? "Trocar foto" : "Enviar foto"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} />
              </label>
              {imageUrl && (
                <button type="button" className="block text-sm text-terracotta-ink underline" onClick={() => setImageUrl(null)}>
                  Remover foto
                </button>
              )}
            </div>
          </div>
          {imageUrl && (
            <Checkbox checked={imageIsPlaceholder} onChange={setImageIsPlaceholder}>
              Imagem provisória ou ilustrativa (não é foto real deste prato). O cardápio mostra o aviso “Imagem ilustrativa”.
            </Checkbox>
          )}
        </div>

        <div className="grid gap-1 sm:grid-cols-2">
          <Checkbox checked={available} onChange={setAvailable}>
            Disponível para pedido
          </Checkbox>
          <Checkbox checked={published} onChange={setPublished}>
            Publicado no cardápio
          </Checkbox>
        </div>
        <div className="w-40">
          <label htmlFor="p-ordem" className="label">
            Ordem de exibição
          </label>
          <input id="p-ordem" className="field" type="number" min={0} max={100000} value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2 border-t border-line p-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving || uploading}>
            {saving ? "Salvando…" : "Salvar prato"}
          </button>
        </div>
      </div>
    </form>
  );
}
