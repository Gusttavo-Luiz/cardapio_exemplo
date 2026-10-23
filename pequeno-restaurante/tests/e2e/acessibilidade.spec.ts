import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Verificação automática de acessibilidade (WCAG 2 A/AA) nas telas principais.
for (const [name, path, ready] of [
  ["cardápio", "/", "Cardápio"],
  ["privacidade", "/privacidade/", "Política de privacidade"],
  ["painel", "/admin/", "Antes de divulgar o cardápio"],
] as const) {
  test(`sem problemas de acessibilidade: ${name}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: ready, exact: true })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
  });
}

test("sem problemas de acessibilidade: carrinho aberto", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Adicionar Bebida (exemplo) ao pedido" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Adicionar ao pedido/ }).click();
  await page.getByRole("button", { name: /Ver pedido/ }).click();
  await expect(page.getByRole("heading", { name: "Seu pedido" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).include("dialog[open]").analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
