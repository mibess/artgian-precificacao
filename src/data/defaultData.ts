import { GlobalSettings, Filament, Printer, ProductItem, PackagingItem, CustomPackagingAddon } from "../types/pricing";

export const defaultSettings: GlobalSettings = {
  energyKwhPrice: 1.02,
  defaultFilamentPricePerKg: 105.00,
  defaultPrinterWatts: 110, // Bambu Lab A1
  defaultVariableCostPercent: 10,
  marketplaces: [
    {
      id: "shopee",
      name: "Shopee",
      commissionPercent: 20,
      fixedFee: 4.00,
      enabled: true,
      colorBadge: "bg-orange-50 text-orange-700 border-orange-200"
    },
    {
      id: "ml_classico",
      name: "Mercado Livre (Clássico)",
      commissionPercent: 14.0,
      fixedFee: 6.00,
      enabled: false,
      colorBadge: "bg-yellow-50 text-yellow-800 border-yellow-200"
    },
    {
      id: "ml_premium",
      name: "Mercado Livre (Premium)",
      commissionPercent: 19.0,
      fixedFee: 6.00,
      enabled: false,
      colorBadge: "bg-amber-50 text-amber-800 border-amber-200"
    }
  ]
};

export const defaultFilaments: Filament[] = [
  { id: "fil-1", name: "PLA Branco", brand: "Padrão", material: "PLA", pricePerKg: 105.00, colorHex: "#ffffff" },
  { id: "fil-2", name: "PLA Preto", brand: "Padrão", material: "PLA", pricePerKg: 105.00, colorHex: "#111827" },
  { id: "fil-3", name: "PLA Vermelho", brand: "Padrão", material: "PLA", pricePerKg: 105.00, colorHex: "#ef4444" },
  { id: "fil-4", name: "PLA Silk Ouro", brand: "Premium", material: "Silk", pricePerKg: 135.00, colorHex: "#eab308" },
  { id: "fil-5", name: "PETG Preto", brand: "Padrão", material: "PETG", pricePerKg: 115.00, colorHex: "#374151" }
];

export const defaultPrinters: Printer[] = [
  { id: "prn-a1", name: "Bambu Lab A1 (Padrão)", powerWatts: 110, notes: "Mesa 256x256mm - Média de operação ~110W" },
  { id: "prn-a1-mini", name: "Bambu Lab A1 Mini", powerWatts: 85, notes: "Mesa 180x180mm - Média ~85W" },
  { id: "prn-p1s", name: "Bambu Lab P1S / X1C", powerWatts: 100, notes: "Câmara fechada - Média ~100W" },
  { id: "prn-default-95", name: "Impressora Genérica (95W)", powerWatts: 95, notes: "Potência da planilha de referência" },
  { id: "prn-ender3", name: "Creality Ender 3 V3", powerWatts: 120, notes: "Média nominal ~120W" },
  { id: "prn-k1", name: "Creality K1 / K1C", powerWatts: 150, notes: "Alta velocidade ~150W" }
];

export const defaultCustomPackagingAddons: CustomPackagingAddon[] = [
  {
    id: "addon-cartao-agradecimento",
    name: "Cartão de Agradecimento",
    price: 0.50,
    description: "Cartão impresso com mensagem de carinho e agradecimento",
    enabledByDefault: true
  },
  {
    id: "addon-fita-cetim",
    name: "Fita de Cetim / Laço",
    price: 0.35,
    description: "Fita decorativa com laço para presente",
    enabledByDefault: false
  },
  {
    id: "addon-tag-envio",
    name: "Tag Personalizada",
    price: 0.25,
    description: "Tag com logotipo e instrução de cuidados com a peça 3D",
    enabledByDefault: false
  }
];

export const defaultPackagings: PackagingItem[] = [
  {
    id: "pkg-caixa-20x15x10",
    name: "CAIXA PAPELAO 20X15X10",
    width: 15,
    height: 10,
    length: 20,
    boxPrice: 1.45,
    bubbleWrapPrice: 0.70,
    stickerPrice: 0.18,
    tissuePaperPrice: 0.11,
    thankYouCardPrice: 0.50,
    otherPrice: 0.00,
    otherDescription: ""
  },
  {
    id: "pkg-caixa-14x10x4",
    name: "CAIXA PAPELAO 14X10X4",
    width: 10,
    height: 4,
    length: 14,
    boxPrice: 0.68,
    bubbleWrapPrice: 0.70,
    stickerPrice: 0.18,
    tissuePaperPrice: 0.11,
    thankYouCardPrice: 0.50,
    otherPrice: 0.00,
    otherDescription: ""
  },
  {
    id: "pkg-caixa-24x15x10",
    name: "CAIXA PAPELAO 24X15X10",
    width: 15,
    height: 10,
    length: 24,
    boxPrice: 1.42,
    bubbleWrapPrice: 0.70,
    stickerPrice: 0.18,
    tissuePaperPrice: 0.11,
    thankYouCardPrice: 0.50,
    otherPrice: 0.00,
    otherDescription: ""
  },
  {
    id: "pkg-caixa-12x12x11",
    name: "CAIXA DE PAPELAO 12X12X11",
    width: 12,
    height: 11,
    length: 12,
    boxPrice: 0.88,
    bubbleWrapPrice: 0.70,
    stickerPrice: 0.18,
    tissuePaperPrice: 0.11,
    thankYouCardPrice: 0.50,
    otherPrice: 0.00,
    otherDescription: ""
  },
  {
    id: "pkg-sacola-21x8x17",
    name: "SACOLINHA AZUL KRAFT 21X8X17",
    width: 8,
    height: 17,
    length: 21,
    boxPrice: 2.50,
    bubbleWrapPrice: 0.70,
    stickerPrice: 0.18,
    tissuePaperPrice: 0.11,
    thankYouCardPrice: 0.50,
    otherPrice: 0.00,
    otherDescription: ""
  }
];

export const defaultProducts: ProductItem[] = [
  {
    id: "prod-rena-branca",
    name: "Rena Branca de Natal",
    category: "Natal",
    quantityInBatch: 1,
    isMultiPart: false,
    parts: [
      {
        id: "part-rena",
        name: "Rena Branca de Natal",
        filamentGrams: 76,
        printTimeString: "5h40min",
        printTimeHours: 5 + 40 / 60,
        printerWattsOverride: 95,
      }
    ],
    packagingCost: 3.50,
    accessoriesCost: 0,
    variableCostPercent: null,
    notes: "Peça decorativa natalina em PLA Branco",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-chaveiros-labas",
    name: "16 Chaveiros Labas",
    category: "Chaveiros",
    quantityInBatch: 16,
    isMultiPart: false,
    parts: [
      {
        id: "part-chaveiro",
        name: "16 unidades chaveiro",
        filamentGrams: 108,
        printTimeString: "7h15min",
        printTimeHours: 7.25,
        printerWattsOverride: 95,
      }
    ],
    packagingCost: 3.00,
    accessoriesCost: 9.60,
    variableCostPercent: null,
    notes: "Lote com 16 chaveiros. Acessórios: 16 argolas a R$ 0,60/un",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-urso-natal",
    name: "Urso Natal Tricô",
    category: "Natal",
    quantityInBatch: 1,
    isMultiPart: true,
    parts: [
      {
        id: "part-urso-1",
        name: "Parte 1",
        filamentGrams: 15,
        printTimeString: "2h",
        printTimeHours: 2.0,
        printerWattsOverride: 95,
      },
      {
        id: "part-urso-2",
        name: "Parte 2",
        filamentGrams: 2,
        printTimeString: "25min",
        printTimeHours: 25 / 60,
        printerWattsOverride: 95,
      },
      {
        id: "part-urso-3",
        name: "Parte 3",
        filamentGrams: 1,
        printTimeString: "12min",
        printTimeHours: 12 / 60,
        printerWattsOverride: 95,
      }
    ],
    packagingCost: 2.00,
    accessoriesCost: 0,
    variableCostPercent: null,
    notes: "Urso articulado ou multi-peças com 3 partes",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
