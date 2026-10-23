import { useEffect, useState } from "react";
import { getMenuReader } from "../data";
import { referenceSettings } from "../data/demoData";
import type { Settings } from "../data/types";
import { Footer } from "../public/Footer";

// Texto de privacidade que descreve o funcionamento real deste site. Se o restaurante passar a
// coletar outros dados (por exemplo, um formulário ou ferramenta de análise), este texto precisa mudar.
export function PrivacyApp() {
  const [settings, setSettings] = useState<Settings>(referenceSettings);
  useEffect(() => {
    const state = getMenuReader();
    if (state.kind === "ready") state.repo.loadMenu().then((m) => setSettings(m.settings)).catch(() => {});
  }, []);
  const s = settings;

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <a href="../" className="font-serif text-lg font-semibold">
            ← {s.restaurantName}
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 leading-relaxed [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-6">
        <h1 className="text-3xl font-semibold">Política de privacidade</h1>
        <p className="text-warmgray">Cardápio digital do {s.restaurantName}</p>

        <h2>Resumo</h2>
        <p>
          Este cardápio pode ser usado sem cadastro e sem login. O site não usa cookies de rastreamento, anúncios ou ferramentas de análise de
          visitantes, e não recebe dados de pagamento.
        </p>

        <h2>O que fica no seu aparelho</h2>
        <p>
          Os itens que você coloca no pedido ficam guardados no próprio navegador (armazenamento local) por até 12 horas, para que uma atualização
          acidental da página não apague o pedido. Esses dados não são enviados ao restaurante nem a um servidor. Você pode apagá-los a qualquer
          momento com o botão “Limpar carrinho” ou limpando os dados do site no navegador.
        </p>

        <h2>Pedidos pelo WhatsApp</h2>
        <p>
          Ao finalizar, o site monta uma mensagem com os itens escolhidos e, se você preencher, o endereço de entrega, um ponto de referência, a forma
          de pagamento e um nome para o pedido. Esses dados <strong>não são gravados pelo site</strong>: eles só são enviados se você mesmo enviar a
          mensagem no WhatsApp. A partir daí, a conversa é tratada pelo restaurante para atender o seu pedido, e o uso do WhatsApp segue os termos e a
          política de privacidade do próprio aplicativo.
        </p>
        <p>Pedimos apenas o necessário para o pedido. O nome é opcional, e o endereço só é solicitado para entrega.</p>

        <h2>Dados técnicos</h2>
        <p>
          Como em qualquer site, os serviços de hospedagem (GitHub Pages) e de banco de dados que fornece o cardápio (Supabase) podem registrar dados
          técnicos das conexões, como endereço IP e tipo de navegador, para funcionamento e segurança. As fontes e imagens do cardápio são carregadas a
          partir desses mesmos serviços.
        </p>

        <h2>Seus direitos</h2>
        <p>
          Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode pedir informações, correção ou exclusão dos dados pessoais
          enviados ao restaurante, como os da conversa de pedido.
        </p>
        <p>
          <strong>Responsável pelo tratamento dos dados:</strong> {s.privacyController || `${s.restaurantName} (dados de identificação a definir)`}
          <br />
          <strong>Contato:</strong> {s.privacyContact || (s.phoneConfirmed && s.phone) || "a definir pelo restaurante"}
        </p>

        <p className="mt-8 text-sm text-warmgray">Última atualização: outubro de 2026.</p>
      </main>
      <Footer settings={s} base="../" />
    </>
  );
}
