// Reduz as fotos antes do envio: o cardápio carrega mais rápido no celular e o armazenamento
// não guarda arquivos de vários megabytes vindos direto da câmera.

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export async function prepareImage(file: File, maxWidth = 1600): Promise<Blob> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Use uma foto em JPG, PNG ou WebP.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("A foto é muito grande (máximo de 15 MB).");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Não foi possível abrir esta imagem.");
  });
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  // Navegadores que não geram WebP devolvem PNG; nesse caso usa JPEG, que é bem menor.
  const webp = await toBlob("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await toBlob("image/jpeg");
  if (!blob) throw new Error("Não foi possível preparar a imagem.");
  return blob;
}
