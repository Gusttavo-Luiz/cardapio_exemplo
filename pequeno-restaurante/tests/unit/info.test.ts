import { describe, expect, it } from "vitest";
import { pendingItems } from "../../src/admin/pending";
import { isSecretKey } from "../../src/config";
import { demoMenu } from "../../src/data/demoData";
import { formatDays, formatHours, formatTime, restaurantJsonLd } from "../../src/lib/restaurantInfo";
import { settingsSchema } from "../../src/lib/validation";
import { product, settings } from "./fixtures";

describe("horários", () => {
  it("formata dias e horas em português", () => {
    expect(formatTime("11:30")).toBe("11h30");
    expect(formatTime("14:00")).toBe("14h");
    expect(formatDays([1, 2, 3, 4, 5])).toBe("Segunda a sexta");
    expect(formatDays([6])).toBe("Sábado");
    expect(formatDays([1, 3, 5])).toBe("Segunda, quarta e sexta");
    expect(formatDays([0, 1, 2, 3, 4, 5, 6])).toBe("Todos os dias");
    expect(formatHours({ days: [1, 2, 3, 4, 5], opens: "11:30", closes: "14:00" })).toBe("Segunda a sexta, das 11h30 às 14h");
  });
});

describe("dados estruturados", () => {
  it("não publica informações não confirmadas", () => {
    const data = restaurantJsonLd(settings(), "https://exemplo.test/");
    expect(data).toEqual({ "@context": "https://schema.org", "@type": "Restaurant", name: "Pequeno Restaurante", url: "https://exemplo.test/", hasMenu: "https://exemplo.test/" });
  });

  it("inclui endereço, telefone, horário e Instagram depois de confirmados", () => {
    const data = restaurantJsonLd(
      settings({ addressConfirmed: true, phoneConfirmed: true, hoursConfirmed: true, instagramConfirmed: true }),
      "https://exemplo.test/",
    );
    expect(data.address).toMatchObject({ streetAddress: "Rua Amazonas, 26", postalCode: "01121-030", addressCountry: "BR" });
    expect(data.telephone).toBe("+551133159015");
    expect(data.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "11:30", closes: "14:00" },
    ]);
    expect(data.sameAs).toEqual(["https://www.instagram.com/pequeno_restaurante/"]);
  });
});

describe("pendências antes de publicar", () => {
  it("lista tudo o que ainda depende do proprietário nos dados iniciais", () => {
    const ids = pendingItems({ ...demoMenu, settings: settings(), products: [] }).map((i) => i.id);
    expect(ids).toEqual(["pratos", "capa", "endereco", "telefone", "whatsapp", "instagram", "horario", "atendimento", "pagamento", "taxa", "privacidade"]);
  });

  it("fica vazia quando tudo foi confirmado", () => {
    const s = settings({
      heroImageUrl: "https://exemplo.test/capa.webp",
      heroImageIsPlaceholder: false,
      addressConfirmed: true,
      phoneConfirmed: true,
      whatsappConfirmed: true,
      instagramConfirmed: true,
      hoursConfirmed: true,
      servicesConfirmed: true,
      paymentMethods: ["Pix"],
      paymentsConfirmed: true,
      deliveryFeeMode: "fixed",
      privacyController: "Pequeno Restaurante Ltda.",
      privacyContact: "contato@exemplo.test",
    });
    const products = [product({ imageUrl: "https://exemplo.test/p.webp" })];
    expect(pendingItems({ ...demoMenu, settings: s, products })).toEqual([]);
  });
});

describe("validação das configurações", () => {
  it("aceita os dados de referência", () => {
    expect(settingsSchema.safeParse(settings()).success).toBe(true);
  });
  it("não deixa ativar o WhatsApp sem número válido", () => {
    expect(settingsSchema.safeParse(settings({ whatsapp: "123", whatsappConfirmed: true })).success).toBe(false);
  });
  it("recusa horário que fecha antes de abrir", () => {
    expect(settingsSchema.safeParse(settings({ hours: [{ days: [1], opens: "15:00", closes: "14:00" }] })).success).toBe(false);
  });
  it("recusa endereço de imagem perigoso", () => {
    expect(settingsSchema.safeParse(settings({ heroImageUrl: "javascript:alert(1)" })).success).toBe(false);
  });
});

describe("chave do Supabase", () => {
  const jwt = (role: string) => `x.${btoa(JSON.stringify({ role })).replace(/=+$/, "")}.y`;
  it("reconhece chaves secretas", () => {
    expect(isSecretKey("sb_secret_abc")).toBe(true);
    expect(isSecretKey(jwt("service_role"))).toBe(true);
  });
  it("aceita chaves públicas", () => {
    expect(isSecretKey("sb_publishable_abc")).toBe(false);
    expect(isSecretKey(jwt("anon"))).toBe(false);
  });
});
