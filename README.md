# Cardápio Bardock

Cardápio digital do Bardock: cervejas, baldes, drinks e caipirinhas, whiskies e gins, narguile e diversos, com os preços em reais.

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

O QR code atual aponta para a versão do cardápio publicada no Claude. Se o cardápio passar a ser publicado em outro endereço (como o GitHub Pages deste repositório), gere um QR code novo com esse endereço.
