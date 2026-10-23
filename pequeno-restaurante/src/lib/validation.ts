import { z } from "zod";
import { toWhatsappNumber } from "./text";

// Regras de validação do painel. As mesmas regras existem como restrições no banco
// (supabase/migrations), então um dado inválido é recusado mesmo que chegue por outro caminho.

const MAX_PRICE_CENTS = 1_000_000;
// Endereços https, caminhos locais (imagens de demonstração) ou imagens enviadas no modo de demonstração.
const httpsUrl = z
  .string()
  .trim()
  .refine(
    (v) =>
      v === "" ||
      (v.length <= 1000 && (/^https:\/\/\S+$/.test(v) || /^\.?\/?[\w./-]+$/.test(v))) ||
      (v.startsWith("data:image/") && v.length <= 3_000_000),
    "Use um endereço https://",
  );

export const optionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().trim().min(1, "Dê um nome à variação.").max(60),
  priceCents: z.number().int().min(0).max(MAX_PRICE_CENTS),
});

export const productSchema = z.object({
  categoryId: z.string().nullable(),
  name: z.string().trim().min(2, "O nome precisa ter pelo menos 2 letras.").max(120),
  description: z.string().trim().max(1000, "Descrição com até 1000 caracteres."),
  priceCents: z.number().int().min(0, "Preço inválido.").max(MAX_PRICE_CENTS, "Preço muito alto."),
  options: z.array(optionSchema).max(12, "Até 12 variações."),
  imageUrl: httpsUrl.nullable(),
  imageIsPlaceholder: z.boolean(),
  available: z.boolean(),
  published: z.boolean(),
  position: z.number().int().min(0).max(100_000),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "O nome precisa ter pelo menos 2 letras.").max(60),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens.").max(60),
  position: z.number().int().min(0).max(100_000),
  active: z.boolean(),
});

export const zoneSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da região.").max(80),
  feeCents: z.number().int().min(0).max(MAX_PRICE_CENTS),
  active: z.boolean(),
  position: z.number().int().min(0).max(100_000),
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário no formato 11:30.");

export const settingsSchema = z
  .object({
    restaurantName: z.string().trim().min(2).max(80),
    tagline: z.string().trim().max(120),
    heroTitle: z.string().trim().min(2).max(120),
    heroSubtitle: z.string().trim().max(200),
    heroImageUrl: httpsUrl.nullable(),
    heroImageIsPlaceholder: z.boolean(),
    addressLine: z.string().trim().max(160),
    district: z.string().trim().max(80),
    city: z.string().trim().max(80),
    state: z.string().trim().max(2),
    postalCode: z.string().trim().regex(/^(\d{5}-?\d{3})?$/, "CEP no formato 01121-030."),
    mapsUrl: httpsUrl,
    addressConfirmed: z.boolean(),
    phone: z.string().trim().max(30),
    phoneConfirmed: z.boolean(),
    whatsapp: z
      .string()
      .trim()
      .max(30)
      .refine((v) => v === "" || toWhatsappNumber(v) !== null, "Número de WhatsApp com DDD, ex.: (11) 3315-9015."),
    whatsappConfirmed: z.boolean(),
    instagram: z.string().trim().max(60),
    instagramConfirmed: z.boolean(),
    hours: z
      .array(
        z
          .object({
            days: z.array(z.number().int().min(0).max(6)).min(1, "Marque pelo menos um dia.").max(7),
            opens: time,
            closes: time,
          })
          .refine((h) => h.opens < h.closes, "O horário de fechamento deve ser depois da abertura."),
      )
      .max(14),
    hoursNote: z.string().trim().max(200),
    hoursConfirmed: z.boolean(),
    dineIn: z.boolean(),
    pickup: z.boolean(),
    delivery: z.boolean(),
    servicesConfirmed: z.boolean(),
    paymentMethods: z.array(z.string().trim().min(1).max(40)).max(12),
    paymentsConfirmed: z.boolean(),
    deliveryFeeMode: z.enum(["none", "fixed", "zones"]),
    deliveryFeeCents: z.number().int().min(0).max(MAX_PRICE_CENTS),
    deliveryNote: z.string().trim().max(300),
    dailyProductId: z.string().nullable(),
    privacyController: z.string().trim().max(160),
    privacyContact: z.string().trim().max(160),
  })
  .refine((s) => !s.whatsappConfirmed || toWhatsappNumber(s.whatsapp) !== null, {
    message: "Para ativar os pedidos pelo WhatsApp, informe um número válido.",
    path: ["whatsapp"],
  });

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}
