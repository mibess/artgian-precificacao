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
  commissionCap?: number; // Teto máximo da comissão em R$ (opcional)
  fixedFeeMinPrice?: number; // Preço mínimo a partir do qual incide taxa fixa (opcional)
}

export interface GlobalSettings {
  energyKwhPrice: number; // e.g. 1.02
  defaultFilamentPricePerKg: number; // e.g. 105.00
  defaultPrinterWatts: number; // e.g. 95
  defaultVariableCostPercent: number; // e.g. 10 (%)
  machineCostPerHour?: number; // Depreciação e manutenção da máquina (R$/hora) - opcional
  laborCostPerHour?: number; // Custo de hora de mão de obra / acabamento (R$/hora) - opcional
  variableCostAppliesToPackaging?: boolean; // Se a taxa de perda incide sobre embalagem e acessórios (default: true)
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
  width: number; // Largura (cm)
  height: number; // Altura (cm)
  length: number; // Comprimento (cm)
  boxPrice: number; // Valor da caixa
  bubbleWrapPrice: number; // Valor do plástico bolha
  stickerPrice: number; // Valor do adesivo
  tissuePaperPrice: number; // Valor da seda
  thankYouCardPrice: number; // Valor do cartão de agradecimento (padrão R$ 0,50)
  otherPrice: number; // Qualquer outro personalizado avulso
  otherDescription?: string; // Descrição opcional do item personalizado avulso
  customAddonIds?: string[]; // IDs dos personalizados gravados ativos
  customItems?: PackagingCustomItem[]; // Itens extras dinâmicos
}

/** Imagem de produto hospedada no S3. Guardamos só a chave; a URL pública é derivada do ambiente. */
export interface ProductImage {
  key: string;
}

export const MAX_PRODUCT_IMAGES = 3;

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  quantityInBatch: number; // e.g. 1 (Rena), 16 (Chaveiros)
  isMultiPart: boolean;
  parts: ProductPart[];
  packagingCost: number; // e.g. 3.50 (custo total da embalagem)
  packagingId?: string | null; // ID da embalagem pré-cadastrada selecionada
  isCustomPackagingCost?: boolean; // Se true, o usuário inseriu um valor manual customizado
  packagingMode?: "perBatch" | "perUnit"; // "perBatch" = 1 embalagem para o lote todo; "perUnit" = 1 por unidade
  accessoriesCost: number; // e.g. 9.60
  laborHours?: number; // Horas dedicadas de mão de obra / pós-processamento (default 0)
  variableCostPercent?: number | null; // null = usa o padrão global do sistema
  notes?: string;
  images?: ProductImage[]; // até MAX_PRODUCT_IMAGES fotos do produto (S3)
  createdAt: string;
  updatedAt: string;
}

export interface MarginRow {
  marginPercent: number; // Markup sobre o custo (0.2, 0.5, 1.0, etc.)
  marginLabel: string; // "20%", "50%", "100%", "300%"
  
  // Venda Direta
  directSalePrice: number;
  directProfit: number;
  directUnitSalePrice: number;
  directUnitProfit: number;

  // Marketplaces
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
  machineCost: number;
  laborCost: number;
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

/**
 * Re-exporta calculatePackagingTotal para manter compatibilidade com módulos legados
 */
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
