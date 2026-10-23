import { expect, test, type Page } from "@playwright/test";

async function openMenu(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cardápio", exact: true })).toBeVisible();
}

const dialog = (page: Page) => page.getByRole("dialog");

async function addProduct(page: Page, name: string, opts: { option?: string; quantity?: number; notes?: string } = {}) {
  await page.getByRole("button", { name: `Adicionar ${name} ao pedido` }).click();
  if (opts.option) await dialog(page).getByLabel(opts.option).check();
  for (let i = 1; i < (opts.quantity ?? 1); i++) await dialog(page).getByRole("button", { name: /Aumentar quantidade/ }).click();
  if (opts.notes) await dialog(page).getByLabel("Observações").fill(opts.notes);
  await dialog(page).getByRole("button", { name: /Adicionar ao pedido/ }).click();
  await expect(dialog(page)).toBeHidden();
}

test("mostra aviso de demonstração e identifica o conteúdo de teste", async ({ page }) => {
  await openMenu(page);
  await expect(page.getByText("Modo de demonstração.")).toBeVisible();
  await expect(page.getByText("Conteúdo de teste").first()).toBeVisible();
  await expect(page.getByText("Imagem ilustrativa").first()).toBeVisible();
  await expect(page.getByText("a confirmar").first()).toBeVisible();
  // Rascunhos não aparecem para clientes.
  await expect(page.getByText("Rascunho não publicado (exemplo)")).toHaveCount(0);
});

test("chamada principal visível sem rolar a página", async ({ page }) => {
  await openMenu(page);
  await expect(page.getByRole("heading", { name: "Seu almoço com sabor de comida caseira" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Ver cardápio" })).toBeInViewport();
});

test("busca por nome e descrição, ignorando acentos", async ({ page }) => {
  await openMenu(page);
  const search = page.getByPlaceholder("O que você está procurando?");
  await search.fill("sobremesa");
  await expect(page.getByRole("heading", { name: "Sobremesa (exemplo)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bebida (exemplo)" })).toHaveCount(0);
  await search.fill("variacoes");
  await expect(page.getByRole("heading", { name: "Prato com tamanhos (exemplo)" })).toBeVisible();
  await search.fill("xyz inexistente");
  await expect(page.getByText("Nenhum prato encontrado")).toBeVisible();
  await page.getByRole("button", { name: "Ver todo o cardápio" }).click();
  await expect(page.getByRole("heading", { name: "Bebida (exemplo)" })).toBeVisible();
});

test("filtra por categoria sem recarregar e com endereço legível", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Bebidas", exact: true }).click();
  await expect(page).toHaveURL(/categoria=bebidas/);
  await expect(page.getByRole("heading", { name: "Bebida (exemplo)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sobremesa (exemplo)" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Bebidas", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Todos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sobremesa (exemplo)" })).toBeVisible();
});

test("produto indisponível não pode ser adicionado", async ({ page }) => {
  await openMenu(page);
  await expect(page.getByRole("button", { name: "Prato indisponível (exemplo) indisponível" })).toBeDisabled();
  await page.getByRole("button", { name: "Prato indisponível (exemplo)", exact: true }).click();
  await expect(dialog(page).getByText("Este prato está indisponível no momento.")).toBeVisible();
  await expect(dialog(page).getByRole("button", { name: "Indisponível", exact: true })).toBeDisabled();
  await expect(dialog(page).getByText("Quantidade")).toHaveCount(0);
});

test("carrinho calcula quantidades, subtotais e total e sobrevive à atualização", async ({ page }) => {
  await openMenu(page);
  await addProduct(page, "Prato executivo (exemplo)", { quantity: 2 });
  await addProduct(page, "Prato com tamanhos (exemplo)", { option: "Tamanho G (teste)", notes: "Sem cebola" });
  await addProduct(page, "Bebida (exemplo)");
  // 2 × 25 + 35 + 6 = 91
  await expect(page.getByRole("button", { name: /Ver pedido · 4 itens/ })).toContainText("R$ 91,00");

  await page.reload();
  await page.getByRole("button", { name: /Ver pedido/ }).click();
  const cart = dialog(page);
  await expect(cart.getByText("Sem cebola", { exact: false })).toHaveCount(0); // observação fica no campo
  await expect(cart.getByPlaceholder("Observação (opcional)").nth(1)).toHaveValue("Sem cebola");
  await expect(cart.getByTestId("total")).toHaveText("R$ 91,00");

  await cart.getByRole("button", { name: "Aumentar quantidade de Bebida (exemplo)" }).click();
  await expect(cart.getByTestId("total")).toHaveText("R$ 97,00");
  await cart.getByRole("button", { name: "Diminuir quantidade de Prato executivo (exemplo)" }).click();
  await expect(cart.getByTestId("total")).toHaveText("R$ 72,00");
  await cart.getByRole("button", { name: "Remover Prato executivo (exemplo)" }).click();
  await expect(cart.getByTestId("total")).toHaveText("R$ 47,00");

  await cart.getByRole("button", { name: "Limpar carrinho" }).click();
  await cart.getByRole("group", { name: "Confirmar limpeza" }).getByRole("button", { name: "Limpar carrinho" }).click();
  await expect(cart.getByText("Seu pedido está vazio")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Abrir pedido, vazio" })).toBeVisible();
});

test("mensagem do pedido tem os itens e valores e não confirma o pedido", async ({ page }) => {
  await openMenu(page);
  await addProduct(page, "Prato do dia (exemplo)", { quantity: 2, notes: "Pouco sal" });
  await addProduct(page, "Sobremesa (exemplo)");
  await page.getByRole("button", { name: /Ver pedido/ }).click();
  await dialog(page).getByRole("button", { name: "Continuar" }).click();
  await expect(dialog(page).getByRole("heading", { name: "Finalizar pedido" })).toBeVisible();
  const message = await dialog(page).getByTestId("mensagem-whatsapp").textContent();
  expect(message).toContain("Olá! Gostaria de fazer um pedido no Pequeno Restaurante.");
  expect(message).toContain("• 2 × Prato do dia (exemplo) — R$ 60,00 (R$ 30,00 cada)");
  expect(message).toContain("• 1 × Sobremesa (exemplo) — R$ 10,00");
  expect(message).toContain("• Prato do dia (exemplo): Pouco sal");
  expect(message).toContain("Subtotal: R$ 70,00");
  expect(message).toContain("Total: R$ 70,00");
  expect(message).toContain("Aguardo a confirmação do restaurante. Obrigado!");
  expect(message).not.toContain("Taxa");
  // Demonstração: o envio para o número real fica bloqueado.
  await expect(dialog(page).getByRole("button", { name: "Enviar pelo WhatsApp" })).toBeDisabled();
  await expect(dialog(page).getByText("O pedido só é confirmado depois da resposta do restaurante.")).toBeVisible();
});

test("informações do restaurante e links", async ({ page }) => {
  await openMenu(page);
  const maps = page.getByRole("link", { name: "Abrir no Google Maps" });
  await expect(maps).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=Rua+Amazonas+26+Bom+Retiro+Sao+Paulo");
  await expect(page.getByRole("link", { name: "(11) 3315-9015" })).toHaveAttribute("href", "tel:+551133159015");
  await expect(page.getByRole("link", { name: "@pequeno_restaurante" })).toHaveAttribute("href", "https://www.instagram.com/pequeno_restaurante/");
  await page.getByRole("link", { name: "Política de privacidade" }).click();
  await expect(page.getByRole("heading", { name: "Política de privacidade" })).toBeVisible();
});

test("SEO básico", async ({ page }) => {
  await openMenu(page);
  await expect(page).toHaveTitle("Pequeno Restaurante | Cardápio Digital");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Confira o cardápio do Pequeno Restaurante no Bom Retiro, em São Paulo.");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /og-image\.png$/);
  // Conteúdo de teste não é indexado e não gera dados estruturados.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});
