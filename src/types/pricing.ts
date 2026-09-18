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

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  quantityInBatch: number; // e.g. 1 (Rena), 16 (Chaveiros)
  isMultiPart: boolean;
  parts: ProductPart[];
  packagingCost: number; // e.g. 3.50
  accessoriesCost: number; // e.g. 9.60
  variableCostPercent: number; // e.g. 10 (%)
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
  totalCost: number; // Custo do Produto no lote
  unitCost: number; // Custo do Produto unitário
  margins: MarginRow[];
}
