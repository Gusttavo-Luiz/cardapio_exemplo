# Dados que dependem de confirmação do proprietário

Nenhuma destas informações foi validada com o Pequeno Restaurante. Elas vieram de fontes públicas (Google Maps, Instagram e diretórios) e estão cadastradas como **“a confirmar”**. Enquanto não forem confirmadas no painel, o site mostra o aviso e não as publica como definitivas.

## Contato e funcionamento

| Informação | Valor de referência | Onde confirmar no painel |
| --- | --- | --- |
| Endereço | Rua Amazonas, 26 — Bom Retiro, São Paulo – SP, CEP 01121-030 | Restaurante → Endereço |
| Telefone | (11) 3315-9015 | Restaurante → Contato |
| **WhatsApp para pedidos** | (11) 3315-9015. É um número fixo: confirmar se tem WhatsApp (Business) e se recebe pedidos | Restaurante → Contato. **Os pedidos pelo WhatsApp ficam desligados até essa confirmação** |
| Instagram | @pequeno_restaurante | Restaurante → Contato |
| Horário | Segunda a sexta, das 11h30 às 14h | Restaurante → Horário |
| Fechamentos | Feriados, férias e outros dias fechados | Restaurante → Observação sobre o horário |
| Atendimento | Consumo no local, retirada e entrega (citados em diretórios) | Restaurante → Atendimento. Retirada e entrega só aparecem no pedido depois da confirmação |

## Entrega (se houver)

- [ ] Se faz entrega e para quais bairros ou regiões.
- [ ] Taxa de entrega: única, por região ou nenhuma. Nenhuma taxa é cobrada no site enquanto não for cadastrada.
- [ ] Pedido mínimo, tempo médio ou outras condições, que podem ir no “Aviso sobre entrega”.

## Cardápio

- [ ] Pratos servidos, com nome, descrição e preço reais. **Nenhum prato foi cadastrado**: o banco começa vazio, e os pratos “(exemplo)” só aparecem no modo de demonstração.
- [ ] Quais categorias o restaurante usa. As sugeridas já estão criadas: Pratos do dia, Pratos executivos, Carnes e aves, Peixes, Acompanhamentos, Bebidas e Sobremesas. Categorias sem pratos não aparecem.
- [ ] Variações ou tamanhos (ex.: marmita P/G) e os preços de cada uma.
- [ ] Prato do dia, se houver. O site não tem programação semanal: o proprietário escolhe o prato do dia no painel.
- [ ] Ingredientes, alergênicos e informações nutricionais: só incluir na descrição se a cozinha confirmar.
- [ ] A faixa de preço de diretórios (R$ 20 a R$ 40 por pessoa) não é usada no site.

## Fotos

- [ ] Fotos reais dos pratos, com autorização de uso. Hoje não há nenhuma foto do restaurante no site.
- [ ] Foto para a capa.
- [ ] Imagens provisórias devem ficar marcadas como “Imagem provisória ou ilustrativa” no painel, para o site mostrar o aviso.

## Pagamento e privacidade

- [ ] Formas de pagamento aceitas (dinheiro, Pix, cartões, vale-refeição...).
- [ ] Responsável pelo tratamento dos dados (razão social / CNPJ) e um contato para assuntos de privacidade, exigidos pela política de privacidade (LGPD).

## Publicação

- [ ] Criar o projeto no Supabase e o login do proprietário (veja o README).
- [ ] Trocar o GitHub Pages para “GitHub Actions” (Settings → Pages).
- [ ] Confirmar o endereço final do site antes de imprimir os QR Codes. O QR atual aponta para https://gusttavo-luiz.github.io/cardapio_exemplo/pequeno-restaurante/. Com um domínio próprio, gere o QR de novo no painel e atualize `publicUrl` em `public/config.js` e os endereços em `index.html` (canonical e og:url/og:image) e `public/sitemap.xml`.
- [ ] Fazer um pedido de teste completo pelo WhatsApp com o restaurante.
