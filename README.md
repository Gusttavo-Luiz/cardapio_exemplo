# Cardápio Bardock

Cardápio digital do Bardock: cervejas, baldes, drinks e caipirinhas, whiskies e gins, narguile e diversos, com os preços em reais.

Endereço público: https://gusttavo-luiz.github.io/cardapio_exemplo/

## Arquivos

- `index.html`: o cardápio. É uma página única, sem dependências para instalar. Abra no navegador ou publique em qualquer hospedagem de páginas estáticas (por exemplo, GitHub Pages).
- `qrcode/bardock-qrcode-mesa.png`: plaquinha de mesa com o QR code, pronta para imprimir.
- `qrcode/bardock-qrcode.png`: só o QR code, para usar em outras artes.

## Como alterar itens e preços

Os itens ficam na lista `MENU`, dentro do `<script>` no fim do `index.html`. Cada item é `["Nome", preço]`, e os baldes têm um terceiro campo com a quantidade:

```js
["Skol lata", 5],
["Long Heineken", 65, "6 un."],
```

Use ponto para centavos (`69.9` aparece como `69,90`).

## Sobre o QR code

Os dois QR codes em `qrcode/` abrem https://gusttavo-luiz.github.io/cardapio_exemplo/. Esse endereço só funciona com o GitHub Pages ativado: em **Settings → Pages**, escolha **Deploy from a branch**, branch `main` e pasta `/ (root)`.

Mudar itens ou preços no `index.html` não muda o endereço, então os QR codes já impressos continuam valendo.
