import acompanhamentoImg from "../assets/demo/acompanhamento.svg";
import bebidaImg from "../assets/demo/bebida.svg";
import pratoImg from "../assets/demo/prato.svg";
import sobremesaImg from "../assets/demo/sobremesa.svg";
import type { MenuData, Settings } from "./types";

// CONTEÚDO DE TESTE. Nada aqui representa pratos, preços ou condições reais do Pequeno Restaurante.
// Estes dados só aparecem quando o site ainda não está ligado ao banco (Supabase), sempre com
// o aviso de demonstração na tela. As informações de contato são as divulgadas publicamente e
// estão todas marcadas como "a confirmar".

export const referenceSettings: Settings = {
  restaurantName: "Pequeno Restaurante",
  tagline: "Comida caseira, feita com carinho",
  heroTitle: "Seu almoço com sabor de comida caseira",
  heroSubtitle: "Confira as opções do dia e monte seu pedido",
  heroImageUrl: null,
  heroImageIsPlaceholder: true,

  addressLine: "Rua Amazonas, 26",
  district: "Bom Retiro",
  city: "São Paulo",
  state: "SP",
  postalCode: "01121-030",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Rua+Amazonas+26+Bom+Retiro+Sao+Paulo",
  addressConfirmed: false,

  phone: "(11) 3315-9015",
  phoneConfirmed: false,
  whatsapp: "(11) 3315-9015",
  whatsappConfirmed: false,
  instagram: "pequeno_restaurante",
  instagramConfirmed: false,

  hours: [{ days: [1, 2, 3, 4, 5], opens: "11:30", closes: "14:00" }],
  hoursNote: "",
  hoursConfirmed: false,

  dineIn: true,
  pickup: true,
  delivery: true,
  servicesConfirmed: false,

  paymentMethods: [],
  paymentsConfirmed: false,

  deliveryFeeMode: "none",
  deliveryFeeCents: 0,
  deliveryNote: "",

  dailyProductId: null,

  privacyController: "",
  privacyContact: "",
};

const testDescription = "Conteúdo de teste. Substitua pelos pratos reais no painel administrativo.";

export const demoMenu: MenuData = {
  settings: { ...referenceSettings, dailyProductId: "demo-dia" },
  categories: [
    { id: "cat-dia", name: "Pratos do dia", slug: "pratos-do-dia", position: 10, active: true },
    { id: "cat-exec", name: "Pratos executivos", slug: "pratos-executivos", position: 20, active: true },
    { id: "cat-carnes", name: "Carnes e aves", slug: "carnes-e-aves", position: 30, active: true },
    { id: "cat-peixes", name: "Peixes", slug: "peixes", position: 40, active: true },
    { id: "cat-acomp", name: "Acompanhamentos", slug: "acompanhamentos", position: 50, active: true },
    { id: "cat-bebidas", name: "Bebidas", slug: "bebidas", position: 60, active: true },
    { id: "cat-sobremesas", name: "Sobremesas", slug: "sobremesas", position: 70, active: true },
  ],
  products: [
    {
      id: "demo-dia",
      categoryId: "cat-dia",
      name: "Prato do dia (exemplo)",
      description: testDescription,
      priceCents: 3000,
      options: [],
      imageUrl: pratoImg,
      imageIsPlaceholder: true,
      available: true,
      published: true,
      position: 10,
    },
    {
      id: "demo-exec",
      categoryId: "cat-exec",
      name: "Prato executivo (exemplo)",
      description: testDescription,
      priceCents: 2500,
      options: [],
      imageUrl: pratoImg,
      imageIsPlaceholder: true,
      available: true,
      published: true,
      position: 10,
    },
    {
      id: "demo-variacoes",
      categoryId: "cat-carnes",
      name: "Prato com tamanhos (exemplo)",
      description: "Conteúdo de teste para mostrar como aparecem as variações de um prato.",
      priceCents: 2000,
      options: [
        { id: "p", label: "Tamanho P (teste)", priceCents: 2000 },
        { id: "g", label: "Tamanho G (teste)", priceCents: 3500 },
      ],
      imageUrl: pratoImg,
      imageIsPlaceholder: true,
      available: true,
      published: true,
      position: 10,
    },
    {
      id: "demo-indisponivel",
      categoryId: "cat-peixes",
      name: "Prato indisponível (exemplo)",
      description: "Conteúdo de teste para mostrar como aparece um prato esgotado.",
      priceCents: 3500,
      options: [],
      imageUrl: null,
      imageIsPlaceholder: true,
      available: false,
      published: true,
      position: 10,
    },
    {
      id: "demo-acomp",
      categoryId: "cat-acomp",
      name: "Acompanhamento (exemplo)",
      description: testDescription,
      priceCents: 800,
      options: [],
      imageUrl: acompanhamentoImg,
      imageIsPlaceholder: true,
      available: true,
      published: true,
      position: 10,
    },
    {
      id: "demo-bebida",
      categoryId: "cat-bebidas",
      name: "Bebida (exemplo)",
      description: testDescription,
      priceCents: 600,
      options: [],
      imageUrl: bebidaImg,
      imageIsPlaceholder: true,
      available: true,
      published: true,
      position: 10,
    },
    {
      id: "demo-sobremesa",
      categoryId: "cat-sobremesas",
      name: "Sobremesa (exemplo)",
      description: testDescription,
      priceCents: 1000,
      options: [],
      imageUrl: sobremesaImg,
      imageIsPlaceholder: true,
      available: true,
      published: true,
      position: 10,
    },
    {
      id: "demo-rascunho",
      categoryId: "cat-sobremesas",
      name: "Rascunho não publicado (exemplo)",
      description: "Só aparece na prévia do painel.",
      priceCents: 1200,
      options: [],
      imageUrl: null,
      imageIsPlaceholder: true,
      available: true,
      published: false,
      position: 20,
    },
  ],
  deliveryZones: [],
};
