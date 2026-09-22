import {
  ProductItem,
  GlobalSettings,
  Filament,
  Printer,
  PricingBreakdown,
  MarginRow,
  MarketplaceConfig
} from "../types/pricing";
import { formatHoursToTimeString } from "./timeParser";

export const DEFAULT_MARGIN_PERCENTS = [0.2, 0.3, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

export interface MarginOption {
  value: number;
  label: string;
}

export const AVAILABLE_MARGIN_OPTIONS: MarginOption[] = [
  { value: 0.2, label: "20% de Lucro" },
  { value: 0.3, label: "30% de Lucro" },
  { value: 0.5, label: "50% de Lucro" },
  { value: 1.0, label: "100% de Lucro (Padrão)" },
  { value: 1.5, label: "150% de Lucro" },
  { value: 2.0, label: "200% de Lucro" },
  { value: 2.5, label: "250% de Lucro" },
  { value: 3.0, label: "300% de Lucro" },
];

export function computeMarginRow(
  marginPercent: number,
  totalCost: number,
  batchQty: number,
  unitCost: number,
  marketplaces: MarketplaceConfig[]
): MarginRow {
  const marginLabel = `${Math.round(marginPercent * 100)}%`;

  // Venda Direta
  const directProfit = totalCost * marginPercent;
  const directSalePrice = totalCost + directProfit;
  const directUnitSalePrice = directSalePrice / batchQty;
  const directUnitProfit = directProfit / batchQty;

  // Marketplaces
  const marketplacePrices: MarginRow["marketplacePrices"] = {};

  for (const mp of marketplaces) {
    if (!mp.enabled) continue;

    const commRate = mp.commissionPercent / 100;
    const divisor = 1 - commRate;

    // Preço do lote inteiro no marketplace
    const salePrice = divisor > 0
      ? (directSalePrice + mp.fixedFee) / divisor
      : directSalePrice;
    const feeAmount = (salePrice * commRate) + mp.fixedFee;
    const netProfit = salePrice - feeAmount - totalCost;

    // Preço unitário individual no marketplace
    const unitSalePrice = divisor > 0
      ? (directUnitSalePrice + mp.fixedFee) / divisor
      : directUnitSalePrice;
    const unitFeeAmount = (unitSalePrice * commRate) + mp.fixedFee;
    const unitNetProfit = unitSalePrice - unitFeeAmount - unitCost;

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
  printers: Printer[] = []
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

  const packagingCost = Number(product.packagingCost) || 0;
  const accessoriesCost = Number(product.accessoriesCost) || 0;
  const subtotal = totalFilamentCost + totalEnergyCost + packagingCost + accessoriesCost;

  const isCustomVariableCost = typeof product.variableCostPercent === "number" && product.variableCostPercent !== null;
  const variableCostPercent = isCustomVariableCost
    ? product.variableCostPercent!
    : (settings.defaultVariableCostPercent ?? 10);
  
  const variableCost = subtotal * (variableCostPercent / 100);
  const totalCost = subtotal + variableCost;

  const batchQty = Math.max(1, Number(product.quantityInBatch) || 1);
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
    return { fee: 0, netReceived: 0, netProfit: 0, marginPercent: 0, roi: 0 };
  }

  let fee = 0;
  if (marketplace && marketplace.enabled) {
    fee = (salePrice * (marketplace.commissionPercent / 100)) + marketplace.fixedFee;
  }

  const netReceived = salePrice - fee;
  const netProfit = netReceived - cost;
  const marginPercent = cost > 0 ? (netProfit / cost) * 100 : 0;
  const roi = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

  return {
    fee,
    netReceived,
    netProfit,
    marginPercent,
    roi
  };
}
