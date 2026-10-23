import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Três páginas independentes: o cardápio público, o painel e a política de privacidade.
// O painel tem seu próprio pacote de JavaScript, então quem só consulta o cardápio não o baixa.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        admin: resolve(import.meta.dirname, "admin/index.html"),
        privacidade: resolve(import.meta.dirname, "privacidade/index.html"),
      },
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "jsdom",
  },
});
