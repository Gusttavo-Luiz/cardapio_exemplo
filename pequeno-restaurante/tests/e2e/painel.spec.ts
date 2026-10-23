import { expect, test, type Page } from "@playwright/test";

// No servidor de desenvolvimento sem Supabase, o painel funciona em modo local (só neste navegador).
// O login de verdade depende do Supabase e é coberto pelos testes de permissão em tests/sql.

const dialog = (page: Page) => page.getByRole("dialog");

async function openAdmin(page: Page, tab: string) {
  await page.goto("/admin/");
  await page.getByRole("navigation", { name: "Seções do painel" }).getByRole("button", { name: tab, exact: true }).click();
}

test("o administrador cria, edita, publica e retira pratos", async ({ page }) => {
  await openAdmin(page, "Pratos");
  await page.getByRole("button", { name: "Novo prato" }).click();
  await dialog(page).getByLabel("Nome do prato").fill("Feijoada de teste");
  await dialog(page).getByLabel("Descrição").fill("Prato cadastrado no teste automático.");
  await dialog(page).getByLabel("Preço (R$)").fill("32,90");
  await dialog(page).getByLabel("Publicado no cardápio").check();
  await dialog(page).getByRole("button", { name: "Salvar prato" }).click();
  await expect(page.getByText("Feijoada de teste")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Feijoada de teste" })).toBeVisible();
  await expect(page.getByText("R$ 32,90")).toBeVisible();

  await openAdmin(page, "Pratos");
  const row = page.getByRole("listitem").filter({ hasText: "Feijoada de teste" });
  await row.getByRole("button", { name: "Editar" }).click();
  await dialog(page).getByLabel("Preço (R$)").fill("34,50");
  await dialog(page).getByRole("button", { name: "Salvar prato" }).click();
  await row.getByRole("switch", { name: "Disponível: Feijoada de teste" }).click();
  await expect(page.getByText("Marcado como indisponível.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("R$ 34,50")).toBeVisible();
  await expect(page.getByRole("button", { name: "Feijoada de teste indisponível" })).toBeDisabled();

  await openAdmin(page, "Pratos");
  await row.getByRole("switch", { name: "Publicado: Feijoada de teste" }).click();
  await expect(page.getByText("Prato retirado do cardápio.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Feijoada de teste" })).toHaveCount(0);

  await page.goto("/?previa=1");
  await expect(page.getByText("Prévia do administrador.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Feijoada de teste" })).toBeVisible();
});

test("validação impede preço inválido", async ({ page }) => {
  await openAdmin(page, "Pratos");
  await page.getByRole("button", { name: "Novo prato" }).click();
  await dialog(page).getByLabel("Nome do prato").fill("Prato sem preço");
  await dialog(page).getByLabel("Preço (R$)").fill("abc");
  await dialog(page).getByRole("button", { name: "Salvar prato" }).click();
  await expect(dialog(page).getByRole("alert")).toHaveText("Informe o preço no formato 25,90.");
});

test("o prato do dia é trocado pelo painel e some quando removido", async ({ page }) => {
  await openAdmin(page, "Pratos");
  await page.getByRole("listitem").filter({ hasText: "Bebida (exemplo)" }).getByRole("button", { name: "Prato do dia" }).click();
  await expect(page.getByText("Prato do dia atualizado.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bebida (exemplo)", level: 2 })).toBeVisible();

  await openAdmin(page, "Pratos");
  await page.getByRole("button", { name: "Remover destaque" }).click();
  await expect(page.getByText("Destaque do prato do dia removido.")).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#prato-do-dia")).toHaveCount(0);
});

test("entrega e taxa configuradas aparecem no pedido", async ({ page }) => {
  await openAdmin(page, "Restaurante");
  await page.getByRole("region").or(page.locator("section")).filter({ hasText: "Atendimento" }).getByLabel("Informação confirmada pelo restaurante").check();
  await page.getByRole("button", { name: "Salvar informações" }).click();
  await expect(page.getByText("Informações salvas.")).toBeVisible();
  await page.getByRole("navigation", { name: "Seções do painel" }).getByRole("button", { name: "Entrega" }).click();
  await page.getByLabel("Taxa única").check();
  await page.getByLabel("Valor da taxa (R$)").fill("7,00");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Configuração de entrega salva.")).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: "Adicionar Bebida (exemplo) ao pedido" }).click();
  await dialog(page).getByRole("button", { name: /Adicionar ao pedido/ }).click();
  await page.getByRole("button", { name: /Ver pedido/ }).click();
  await dialog(page).getByRole("button", { name: "Continuar" }).click();
  await dialog(page).getByLabel("Entrega", { exact: true }).check();
  await dialog(page).getByLabel("Endereço de entrega").fill("Rua de Teste, 10 — Bom Retiro");
  await expect(dialog(page).getByTestId("total")).toHaveText("R$ 13,00");
  const message = await dialog(page).getByTestId("mensagem-whatsapp").textContent();
  expect(message).toContain("Entrega ou retirada: Entrega");
  expect(message).toContain("Endereço de entrega: Rua de Teste, 10 — Bom Retiro");
  expect(message).toContain("Taxa de entrega: R$ 7,00");
  expect(message).toContain("Total: R$ 13,00");

  await dialog(page).getByLabel("Retirada no restaurante").check();
  await expect(dialog(page).getByTestId("total")).toHaveText("R$ 6,00");
});

test("lista de pendências antes de divulgar", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { name: "Antes de divulgar o cardápio" })).toBeVisible();
  await expect(page.getByText("Confirme se o número recebe pedidos pelo WhatsApp")).toBeVisible();
  await expect(page.getByText("Confirme os dias e horários de funcionamento.")).toBeVisible();
});

test("gera o QR Code do cardápio", async ({ page }) => {
  await openAdmin(page, "QR Code");
  await expect(page.getByRole("img", { name: /QR Code para https:\/\/gusttavo-luiz\.github\.io\/cardapio_exemplo\/pequeno-restaurante\// })).toBeVisible();
  await expect(page.getByRole("link", { name: "Baixar PNG" })).toHaveAttribute("download", "cardapio-qrcode.png");
});
