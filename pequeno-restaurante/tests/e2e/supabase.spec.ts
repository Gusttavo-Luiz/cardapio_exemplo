import { expect, test, type Page } from "@playwright/test";

// Simula um projeto Supabase configurado: o config.js aponta para um endereço falso e as
// respostas da API REST são fixas. Assim o caminho de produção é testado sem banco real.

const API = "https://projeto-teste.supabase.co";

const settings = {
  id: 1,
  restaurant_name: "Pequeno Restaurante",
  tagline: "Comida caseira, feita com carinho",
  hero_title: "Seu almoço com sabor de comida caseira",
  hero_subtitle: "Confira as opções do dia e monte seu pedido",
  hero_image_url: null,
  hero_image_is_placeholder: false,
  address_line: "Rua Amazonas, 26",
  district: "Bom Retiro",
  city: "São Paulo",
  state: "SP",
  postal_code: "01121-030",
  maps_url: "https://www.google.com/maps/search/?api=1&query=Rua+Amazonas+26+Bom+Retiro+Sao+Paulo",
  address_confirmed: true,
  phone: "(11) 3315-9015",
  phone_confirmed: true,
  whatsapp: "(11) 3315-9015",
  whatsapp_confirmed: true,
  instagram: "pequeno_restaurante",
  instagram_confirmed: true,
  hours: [{ days: [1, 2, 3, 4, 5], opens: "11:30", closes: "14:00" }],
  hours_note: "",
  hours_confirmed: true,
  dine_in: true,
  pickup: true,
  delivery: false,
  services_confirmed: true,
  payment_methods: ["Pix"],
  payments_confirmed: true,
  delivery_fee_mode: "none",
  delivery_fee_cents: 0,
  delivery_note: "",
  daily_product_id: null,
  privacy_controller: "Responsável de teste",
  privacy_contact: "contato@exemplo.test",
  updated_at: "2026-10-23T00:00:00Z",
};
const categories = [{ id: "c1", name: "Pratos executivos", slug: "pratos-executivos", position: 10, active: true, created_at: "", updated_at: "" }];
let price = 2890;
const products = () => [
  { id: "p1", category_id: "c1", name: "Prato fixo do teste", description: "Descrição do teste", price_cents: price, options: [], image_url: null, image_is_placeholder: false, available: true, published: true, position: 0, created_at: "", updated_at: "" },
];

async function mockSupabase(page: Page) {
  await page.route("**/config.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.CARDAPIO_CONFIG = { supabaseUrl: "${API}", supabaseKey: "sb_publishable_teste", publicUrl: "" };`,
    }),
  );
  await page.route(`${API}/rest/v1/**`, (route) => {
    const url = new URL(route.request().url());
    expect(route.request().headers()["apikey"]).toBe("sb_publishable_teste");
    const table = url.pathname.split("/").pop();
    const body = table === "settings" ? [settings] : table === "categories" ? categories : table === "products" ? products() : [];
    return route.fulfill({ json: body });
  });
}

test.beforeEach(async ({ page }) => {
  price = 2890;
  await mockSupabase(page);
});

test("carrega o cardápio publicado do banco, sem modo de demonstração", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Prato fixo do teste" })).toBeVisible();
  await expect(page.getByText("Modo de demonstração.")).toHaveCount(0);
  await expect(page.getByText("Conteúdo de teste")).toHaveCount(0);
  await expect(page.getByText("a confirmar")).toHaveCount(0);
  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(jsonLd).toMatchObject({ "@type": "Restaurant", name: "Pequeno Restaurante", telephone: "+551133159015" });
});

test("abre o WhatsApp com a mensagem codificada e não confirma o pedido", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Adicionar Prato fixo do teste ao pedido" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Adicionar ao pedido/ }).click();
  await page.getByRole("button", { name: /Ver pedido/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Continuar" }).click();
  // Só uma modalidade confirmada (retirada): já vem escolhida.
  await expect(page.getByRole("dialog").getByText("Modalidade:")).toContainText("Retirada no restaurante");
  const send = page.getByRole("dialog").getByRole("link", { name: "Enviar pelo WhatsApp" });
  const href = (await send.getAttribute("href"))!;
  expect(href.startsWith("https://wa.me/551133159015?text=")).toBe(true);
  const text = new URL(href).searchParams.get("text")!;
  expect(text).toContain("• 1 × Prato fixo do teste — R$ 28,90");
  expect(text).toContain("Entrega ou retirada: Retirada no restaurante");
  expect(text).toContain("Total: R$ 28,90");

  await context.route("https://wa.me/**", (route) => route.fulfill({ body: "WhatsApp simulado" }));
  const popup = context.waitForEvent("page");
  await send.click();
  await (await popup).close();
  await expect(page.getByText("O pedido ainda não está confirmado", { exact: false })).toBeVisible();
  await expect(page.getByText("Abrir o WhatsApp não envia a mensagem sozinho", { exact: false })).toBeVisible();
});

test("avisa quando o preço mudou antes de finalizar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Adicionar Prato fixo do teste ao pedido" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Adicionar ao pedido/ }).click();
  price = 3190;
  await page.getByRole("button", { name: /Ver pedido/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("dialog").getByText("Alguns preços mudaram")).toBeVisible();
  await expect(page.getByRole("dialog").getByTestId("total")).toHaveText("R$ 31,90");
});

test("o painel exige login", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { name: "Painel do cardápio" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo prato" })).toHaveCount(0);
});

test("recusa uma chave secreta no config.js", async ({ page }) => {
  await page.route("**/config.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: `window.CARDAPIO_CONFIG = { supabaseUrl: "${API}", supabaseKey: "sb_secret_x" };` }),
  );
  await page.goto("/");
  await expect(page.getByText("chave secreta do Supabase", { exact: false })).toBeVisible();
});
