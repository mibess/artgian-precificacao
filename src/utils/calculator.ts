import {
  ProductItem,
  GlobalSettings,
  Filament,
  Printer,
  PricingBreakdown,
  MarginRow,
  MarketplaceConfig,
  PackagingItem,
  CustomPackagingAddon,
  calculatePackagingTotal
} from "../types/pricing";
import { formatHoursToTimeString } from "./timeParser";

export const DEFAULT_MARGIN_PERCENTS = [0.2, 0.3, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

export interface MarginOption {
  value: number;
  label: string;
}

export const AVAILABLE_MARGIN_OPTIONS: MarginOption[] = [
  { value: 0.2, label: "20% de Lucro (Markup)" },
  { value: 0.3, label: "30% de Lucro (Markup)" },
  { value: 0.5, label: "50% de Lucro (Markup)" },
  { value: 1.0, label: "100% de Lucro (Padrão 2x)" },
  { value: 1.5, label: "150% de Lucro (Markup)" },
  { value: 2.0, label: "200% de Lucro (Markup 3x)" },
  { value: 2.5, label: "250% de Lucro (Markup)" },
  { value: 3.0, label: "300% de Lucro (Markup 4x)" },
];

export { calculatePackagingTotal };

/**
 * Arredonda valor monetário para 2 casas decimais seguras
 */
export function roundMoney(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Formata valores numéricos para moeda Real (pt-BR)
 */
export function formatBRL(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(amount);
}

/**
 * Calcula a comissão e taxa fixa de um marketplace considerando regras opcionais de teto
 */
export function calculateMarketplaceFee(
  salePrice: number,
  marketplace: MarketplaceConfig
): number {
  if (salePrice <= 0) return 0;

  let commRate = (marketplace.commissionPercent || 0) / 100;
  commRate = Math.min(Math.max(commRate, 0), 0.999);

  let commission = salePrice * commRate;
  if (marketplace.commissionCap && marketplace.commissionCap > 0) {
    commission = Math.min(commission, marketplace.commissionCap);
  }

  let fixedFee = marketplace.fixedFee || 0;
  if (marketplace.fixedFeeMinPrice && salePrice < marketplace.fixedFeeMinPrice) {
    fixedFee = 0;
  }

  return roundMoney(commission + fixedFee);
}

export function computeMarginRow(
  marginPercent: number,
  totalCost: number,
  batchQty: number,
  unitCost: number,
  marketplaces: MarketplaceConfig[]
): MarginRow {
  const marginLabel = `${Math.round(marginPercent * 100)}%`;

  // Venda Direta
  const directProfit = roundMoney(totalCost * marginPercent);
  const directSalePrice = roundMoney(totalCost + directProfit);
  const directUnitSalePrice = roundMoney(directSalePrice / batchQty);
  const directUnitProfit = roundMoney(directProfit / batchQty);

  // Marketplaces
  const marketplacePrices: MarginRow["marketplacePrices"] = {};

  for (const mp of marketplaces) {
    if (!mp.enabled) continue;

    const commRate = Math.min(Math.max((mp.commissionPercent || 0) / 100, 0), 0.999);
    const divisor = 1 - commRate;

    // Preço do lote inteiro no marketplace
    let salePrice = divisor > 0
      ? (directSalePrice + (mp.fixedFee || 0)) / divisor
      : directSalePrice;
    
    // Se houver teto de comissão, ajusta
    if (mp.commissionCap && (salePrice * commRate) > mp.commissionCap) {
      salePrice = directSalePrice + mp.commissionCap + (mp.fixedFee || 0);
    }
    salePrice = roundMoney(salePrice);
    const feeAmount = calculateMarketplaceFee(salePrice, mp);
    const netProfit = roundMoney(salePrice - feeAmount - totalCost);

    // Preço unitário individual no marketplace
    let unitSalePrice = divisor > 0
      ? (directUnitSalePrice + (mp.fixedFee || 0)) / divisor
      : directUnitSalePrice;
    if (mp.commissionCap && (unitSalePrice * commRate) > mp.commissionCap) {
      unitSalePrice = directUnitSalePrice + mp.commissionCap + (mp.fixedFee || 0);
    }
    unitSalePrice = roundMoney(unitSalePrice);
    const unitFeeAmount = calculateMarketplaceFee(unitSalePrice, mp);
    const unitNetProfit = roundMoney(unitSalePrice - unitFeeAmount - unitCost);

    marketplacePrices[mp.id] = {
      salePrice,
      netProfit,
      unitSalePrice,
      unitNetProfit,
      feeAmount
    };
  }

  return {
    marginPercent,
    marginLabel,
    directSalePrice,
    directProfit,
    directUnitSalePrice,
    directUnitProfit,
    marketplacePrices
  };
}

export function findMarginRow(
  pricing: PricingBreakdown,
  targetMarginPercent: number,
  settings: GlobalSettings,
  batchQty: number = 1
): MarginRow {
  const numericTarget = Number(targetMarginPercent);
  const found = pricing.margins.find(m => Math.abs(m.marginPercent - numericTarget) < 0.005);
  if (found) return found;

  return computeMarginRow(
    numericTarget,
    pricing.totalCost,
    batchQty,
    pricing.unitCost,
    settings.marketplaces
  );
}

export function calculatePricing(
  product: ProductItem,
  settings: GlobalSettings,
  filaments: Filament[] = [],
  printers: Printer[] = [],
  packagings: PackagingItem[] = [],
  customAddons: CustomPackagingAddon[] = []
): PricingBreakdown {
  const filamentsMap = new Map(filaments.map(f => [f.id, f]));
  const printersMap = new Map(printers.map(p => [p.id, p]));

  let totalGrams = 0;
  let totalTimeHours = 0;
  let totalFilamentCost = 0;
  let totalEnergyCost = 0;

  for (const part of product.parts) {
    const grams = Number(part.filamentGrams) || 0;
    const hours = Number(part.printTimeHours) || 0;

    totalGrams += grams;
    totalTimeHours += hours;

    // Preço do filamento
    let priceKg = settings.defaultFilamentPricePerKg;
    if (part.filamentPricePerKgOverride !== undefined && part.filamentPricePerKgOverride > 0) {
      priceKg = part.filamentPricePerKgOverride;
    } else if (part.filamentId && filamentsMap.has(part.filamentId)) {
      priceKg = filamentsMap.get(part.filamentId)!.pricePerKg;
    }
    const partFilamentCost = (grams / 1000) * priceKg;
    totalFilamentCost += partFilamentCost;

    // Potência e Energia
    let watts = settings.defaultPrinterWatts;
    if (part.printerWattsOverride !== undefined && part.printerWattsOverride > 0) {
      watts = part.printerWattsOverride;
    } else if (part.printerId && printersMap.has(part.printerId)) {
      watts = printersMap.get(part.printerId)!.powerWatts;
    }
    const kw = watts / 1000;
    const partEnergyCost = hours * kw * settings.energyKwhPrice;
    totalEnergyCost += partEnergyCost;
  }

  // Depreciação / Manutenção de Máquina e Mão de obra (opcionais)
  const machineCost = totalTimeHours * (settings.machineCostPerHour || 0);
  const laborCost = (product.laborHours || 0) * (settings.laborCostPerHour || 0);

  // Embalagem dinâmica
  const batchQty = Math.max(1, Number(product.quantityInBatch) || 1);
  let singlePackagingCost = Number(product.packagingCost) || 0;

  if (!product.isCustomPackagingCost && product.packagingId && packagings.length > 0) {
    const foundPkg = packagings.find(p => p.id === product.packagingId);
    if (foundPkg) {
      singlePackagingCost = calculatePackagingTotal(foundPkg, customAddons);
    }
  }

  const packagingCost = product.packagingMode === "perUnit"
    ? singlePackagingCost * batchQty
    : singlePackagingCost;

  const accessoriesCost = Number(product.accessoriesCost) || 0;
  const subtotal = totalFilamentCost + totalEnergyCost + machineCost + laborCost + packagingCost + accessoriesCost;

  const isCustomVariableCost = typeof product.variableCostPercent === "number" && product.variableCostPercent !== null;
  const variableCostPercent = isCustomVariableCost
    ? product.variableCostPercent!
    : (settings.defaultVariableCostPercent ?? 10);
  
  // Base para cálculo da margem de perda / custo variável
  const variableCostBase = settings.variableCostAppliesToPackaging === false
    ? (totalFilamentCost + totalEnergyCost + machineCost + laborCost)
    : subtotal;

  const variableCost = variableCostBase * (variableCostPercent / 100);
  const totalCost = subtotal + variableCost;
  const unitCost = totalCost / batchQty;

  const margins: MarginRow[] = DEFAULT_MARGIN_PERCENTS.map(marginPercent => {
    return computeMarginRow(marginPercent, totalCost, batchQty, unitCost, settings.marketplaces);
  });

  return {
    totalGrams,
    totalTimeHours,
    totalTimeString: formatHoursToTimeString(totalTimeHours),
    filamentCost: totalFilamentCost,
    energyCost: totalEnergyCost,
    machineCost,
    laborCost,
    packagingCost,
    accessoriesCost,
    subtotal,
    variableCost,
    variableCostPercent,
    isCustomVariableCost,
    totalCost,
    unitCost,
    margins
  };
}

/**
 * Simula o lucro para um valor de venda arbitrário digitado pelo usuário.
 */
export function simulateCustomSalePrice(
  salePrice: number,
  cost: number,
  marketplace?: MarketplaceConfig
) {
  if (!salePrice || salePrice <= 0) {
    return { fee: 0, netReceived: 0, netProfit: 0, markupPercent: 0, marginPercent: 0, roi: 0 };
  }

  let fee = 0;
  if (marketplace) {
    fee = calculateMarketplaceFee(salePrice, marketplace);
  }

  const netReceived = salePrice - fee;
  const netProfit = netReceived - cost;
  
  // Markup sobre o custo (ex: se custo=10 e lucro=10, markup=100%)
  const markupPercent = cost > 0 ? (netProfit / cost) * 100 : 0;
  // Margem sobre a venda (ex: se venda=20 e lucro=10, margem=50%)
  const marginPercent = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
  const roi = markupPercent;

  return {
    fee,
    netReceived,
    netProfit,
    markupPercent,
    marginPercent,
    roi
  };
}
