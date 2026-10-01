export interface Filament {
  id: string;
  name: string;
  brand: string;
  material: string; // PLA, PETG, ABS, TPU, Silk, etc.
  pricePerKg: number; // e.g. 105.00
  colorName?: string;
  colorHex?: string;
}

export interface Printer {
  id: string;
  name: string;
  powerWatts: number; // e.g. 95
  notes?: string;
}

export interface MarketplaceConfig {
  id: string;
  name: string; // "Shopee", "Mercado Livre Clássico", "Mercado Livre Premium"
  commissionPercent: number; // e.g. 20 for 20%
  fixedFee: number; // e.g. 4.00
  enabled: boolean;
  colorBadge: string;
}

export interface GlobalSettings {
  energyKwhPrice: number; // e.g. 1.02
  defaultFilamentPricePerKg: number; // e.g. 105.00
  defaultPrinterWatts: number; // e.g. 95
  defaultVariableCostPercent: number; // e.g. 10 (%)
  marketplaces: MarketplaceConfig[];
}

export interface ProductPart {
  id: string;
  name: string; // e.g. "Corpo", "Parte 1", "Chaveiro"
  filamentGrams: number; // e.g. 76
  filamentId?: string; // specific filament or default
  filamentPricePerKgOverride?: number; // custom filament price if not linked
  printTimeString: string; // e.g. "5h40min"
  printTimeHours: number; // decimal hours (e.g. 5.6667)
  printerId?: string; // specific printer or default
  printerWattsOverride?: number;
}

export interface PackagingCustomItem {
  id: string;
  name: string;
  price: number;
}

export interface CustomPackagingAddon {
  id: string;
  name: string; // Ex: "Cartão de Agradecimento", "Fita de Cetim"
  price: number; // Ex: 0.50
  description?: string;
  enabledByDefault?: boolean;
}

export interface PackagingItem {
  id: string;
  name: string; // Ex: "CAIXA PAPELAO 20X15X10"
  // Dimensões (cm)
  width: number; // Largura (cm)
  height: number; // Altura (cm)
  length: number; // Comprimento (cm)
  // Custos unitários dos componentes da embalagem (R$)
  boxPrice: number; // Valor da caixa
  bubbleWrapPrice: number; // Valor do plástico bolha
  stickerPrice: number; // Valor do adesivo
  tissuePaperPrice: number; // Valor da seda
  thankYouCardPrice: number; // Valor do cartão de agradecimento (padrão R$ 0,50)
  otherPrice: number; // Qualquer outro personalizado avulso
  otherDescription?: string; // Descrição opcional do item personalizado avulso (ex: "Fita de cetim", "Tag")
  customAddonIds?: string[]; // IDs dos personalizados gravados ativos para esta embalagem
  customItems?: PackagingCustomItem[]; // Lista dinâmica de itens extras personalizados adicionais
}

export function calculatePackagingTotal(
  pkg: PackagingItem,
  customAddons: CustomPackagingAddon[] = []
): number {
  const extras = Array.isArray(pkg.customItems)
    ? pkg.customItems.reduce((acc, it) => acc + (Number(it.price) || 0), 0)
    : 0;

  let addonsTotal = 0;
  if (Array.isArray(pkg.customAddonIds) && customAddons.length > 0) {
    const map = new Map(customAddons.map(a => [a.id, a.price]));
    for (const id of pkg.customAddonIds) {
      addonsTotal += Number(map.get(id)) || 0;
    }
  }

  return (
    (Number(pkg.boxPrice) || 0) +
    (Number(pkg.bubbleWrapPrice) || 0) +
    (Number(pkg.stickerPrice) || 0) +
    (Number(pkg.tissuePaperPrice) || 0) +
    (Number(pkg.thankYouCardPrice) || 0) +
    (Number(pkg.otherPrice) || 0) +
    addonsTotal +
    extras
  );
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  quantityInBatch: number; // e.g. 1 (Rena), 16 (Chaveiros)
  isMultiPart: boolean;
  parts: ProductPart[];
  packagingCost: number; // e.g. 3.50 (custo total da embalagem considerado na precificação)
  packagingId?: string | null; // ID da embalagem pré-cadastrada selecionada (se não for personalizada)
  isCustomPackagingCost?: boolean; // Se true, o usuário inseriu um valor manual customizado
  accessoriesCost: number; // e.g. 9.60
  variableCostPercent?: number | null; // null = usa o padrão global do sistema; number = margem personalizada
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarginRow {
  marginPercent: number; // e.g. 0.2 (20%), 0.3, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0
  marginLabel: string; // "20%", "50%", "100%", "300%"
  
  // Venda Direta
  directSalePrice: number;
  directProfit: number;
  directUnitSalePrice: number;
  directUnitProfit: number;

  // Marketplace prices (Shopee, etc.)
  marketplacePrices: {
    [marketplaceId: string]: {
      salePrice: number;
      netProfit: number;
      unitSalePrice: number;
      unitNetProfit: number;
      feeAmount: number;
    }
  };
}

export interface PricingBreakdown {
  totalGrams: number;
  totalTimeHours: number;
  totalTimeString: string;
  filamentCost: number;
  energyCost: number;
  packagingCost: number;
  accessoriesCost: number;
  subtotal: number;
  variableCost: number;
  variableCostPercent: number;
  isCustomVariableCost: boolean;
  totalCost: number; // Custo do Produto no lote
  unitCost: number; // Custo do Produto unitário
  margins: MarginRow[];
}

