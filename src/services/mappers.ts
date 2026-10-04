import {
  ProductItem,
  ProductPart,
  GlobalSettings,
  Filament,
  Printer,
  PackagingItem,
  CustomPackagingAddon,
  ProductImage,
  MAX_PRODUCT_IMAGES
} from "../types/pricing";
import { defaultSettings } from "../data/defaultData";
import { formatHoursToTimeString } from "../utils/timeParser";

/**
 * Conversões puras entre as linhas do banco (snake_case) e os tipos da aplicação (camelCase).
 * Mantidas fora do serviço do Supabase para poderem ser testadas sem rede.
 */

export type DbRow = Record<string, any>;

/**
 * Colunas adicionadas depois do schema original. Se ainda não existirem no banco remoto
 * (migration pendente), o serviço tenta novamente sem elas em vez de falhar o salvamento.
 */
export const OPTIONAL_COLUMNS: Record<string, string[]> = {
  products: ["labor_hours", "packaging_mode", "images"],
  settings: ["machine_cost_per_hour", "labor_cost_per_hour", "variable_cost_applies_to_packaging"]
};

/**
 * Converte valor numérico com segurança: se for 0, respeita 0 e não substitui por fallback.
 */
export function safeNumber(val: any, fallback: number): number {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

function normalizePart(raw: any, index: number): ProductPart {
  const hours = safeNumber(raw?.printTimeHours, 0);
  return {
    ...raw,
    id: raw?.id || `part-${index + 1}`,
    name: raw?.name || `Parte ${index + 1}`,
    filamentGrams: safeNumber(raw?.filamentGrams, 0),
    printTimeHours: hours,
    printTimeString: typeof raw?.printTimeString === "string" && raw.printTimeString
      ? raw.printTimeString
      : formatHoursToTimeString(hours)
  };
}

function normalizeImages(raw: any): ProductImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(img => img && typeof img.key === "string" && img.key)
    .slice(0, MAX_PRODUCT_IMAGES)
    .map(img => ({ key: img.key as string }));
}

// ============ PRODUTOS ============

export function rowToProduct(row: DbRow): ProductItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category || "Geral",
    quantityInBatch: Math.max(1, safeNumber(row.quantity_in_batch, 1)),
    isMultiPart: Boolean(row.is_multi_part),
    parts: Array.isArray(row.parts) ? row.parts.map(normalizePart) : [],
    packagingCost: safeNumber(row.packaging_cost, 0),
    packagingId: row.packaging_id || null,
    isCustomPackagingCost: Boolean(row.is_custom_packaging_cost),
    packagingMode: row.packaging_mode === "perUnit" ? "perUnit" : "perBatch",
    accessoriesCost: safeNumber(row.accessories_cost, 0),
    laborHours: safeNumber(row.labor_hours, 0),
    variableCostPercent: row.variable_cost_percent !== null && row.variable_cost_percent !== undefined
      ? safeNumber(row.variable_cost_percent, 10)
      : null,
    notes: row.notes || "",
    images: normalizeImages(row.images),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

export function productToRow(product: ProductItem, ownerId?: string | null): DbRow {
  const row: DbRow = {
    id: product.id,
    name: product.name,
    category: product.category,
    quantity_in_batch: product.quantityInBatch,
    is_multi_part: product.isMultiPart,
    parts: product.parts,
    packaging_cost: product.packagingCost,
    packaging_id: product.packagingId || null,
    is_custom_packaging_cost: Boolean(product.isCustomPackagingCost),
    packaging_mode: product.packagingMode === "perUnit" ? "perUnit" : "perBatch",
    accessories_cost: product.accessoriesCost,
    labor_hours: safeNumber(product.laborHours, 0),
    variable_cost_percent: typeof product.variableCostPercent === "number" ? product.variableCostPercent : null,
    notes: product.notes || "",
    images: normalizeImages(product.images),
    created_at: product.createdAt,
    updated_at: new Date().toISOString()
  };
  if (ownerId) row.owner_id = ownerId;
  return row;
}

// ============ CONFIGURAÇÕES ============

export function rowToSettings(row: DbRow): GlobalSettings {
  return {
    energyKwhPrice: safeNumber(row.energy_kwh_price, 1.02),
    defaultFilamentPricePerKg: safeNumber(row.default_filament_price_per_kg, 105.00),
    defaultPrinterWatts: safeNumber(row.default_printer_watts, 110),
    defaultVariableCostPercent: safeNumber(row.default_variable_cost_percent, 10),
    machineCostPerHour: safeNumber(row.machine_cost_per_hour, 0),
    laborCostPerHour: safeNumber(row.labor_cost_per_hour, 0),
    variableCostAppliesToPackaging: row.variable_cost_applies_to_packaging !== false,
    marketplaces: Array.isArray(row.marketplaces) ? row.marketplaces : defaultSettings.marketplaces
  };
}

export function settingsToRow(settings: GlobalSettings, id: string, ownerId?: string | null): DbRow {
  const row: DbRow = {
    id,
    energy_kwh_price: settings.energyKwhPrice,
    default_filament_price_per_kg: settings.defaultFilamentPricePerKg,
    default_printer_watts: settings.defaultPrinterWatts,
    default_variable_cost_percent: settings.defaultVariableCostPercent,
    machine_cost_per_hour: safeNumber(settings.machineCostPerHour, 0),
    labor_cost_per_hour: safeNumber(settings.laborCostPerHour, 0),
    variable_cost_applies_to_packaging: settings.variableCostAppliesToPackaging !== false,
    marketplaces: settings.marketplaces,
    updated_at: new Date().toISOString()
  };
  if (ownerId) row.owner_id = ownerId;
  return row;
}

// ============ FILAMENTOS ============

export function rowToFilament(row: DbRow): Filament {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand || "Padrão",
    material: row.material || "PLA",
    pricePerKg: safeNumber(row.price_per_kg, 105.00),
    colorName: row.color_name || undefined,
    colorHex: row.color_hex || "#ffffff"
  };
}

export function filamentToRow(filament: Filament, ownerId?: string | null): DbRow {
  const row: DbRow = {
    id: filament.id,
    name: filament.name,
    brand: filament.brand,
    material: filament.material,
    price_per_kg: filament.pricePerKg,
    color_name: filament.colorName || "",
    color_hex: filament.colorHex || "#ffffff"
  };
  if (ownerId) row.owner_id = ownerId;
  return row;
}

// ============ IMPRESSORAS ============

export function rowToPrinter(row: DbRow): Printer {
  return {
    id: row.id,
    name: row.name,
    powerWatts: safeNumber(row.power_watts, 110),
    notes: row.notes || ""
  };
}

export function printerToRow(printer: Printer, ownerId?: string | null): DbRow {
  const row: DbRow = {
    id: printer.id,
    name: printer.name,
    power_watts: printer.powerWatts,
    notes: printer.notes || ""
  };
  if (ownerId) row.owner_id = ownerId;
  return row;
}

// ============ EMBALAGENS ============

export function rowToPackaging(row: DbRow): PackagingItem {
  return {
    id: row.id,
    name: row.name,
    width: safeNumber(row.width, 0),
    height: safeNumber(row.height, 0),
    length: safeNumber(row.length, 0),
    boxPrice: safeNumber(row.box_price, 0),
    bubbleWrapPrice: safeNumber(row.bubble_wrap_price, 0),
    stickerPrice: safeNumber(row.sticker_price, 0),
    tissuePaperPrice: safeNumber(row.tissue_paper_price, 0),
    thankYouCardPrice: safeNumber(row.thank_you_card_price, 0.50),
    otherPrice: safeNumber(row.other_price, 0),
    otherDescription: row.other_description || "",
    customAddonIds: Array.isArray(row.custom_addon_ids) ? row.custom_addon_ids : [],
    customItems: Array.isArray(row.custom_items) ? row.custom_items : []
  };
}

export function packagingToRow(pkg: PackagingItem, ownerId?: string | null): DbRow {
  const row: DbRow = {
    id: pkg.id,
    name: pkg.name,
    width: pkg.width,
    height: pkg.height,
    length: pkg.length,
    box_price: pkg.boxPrice,
    bubble_wrap_price: pkg.bubbleWrapPrice,
    sticker_price: pkg.stickerPrice,
    tissue_paper_price: pkg.tissuePaperPrice,
    thank_you_card_price: typeof pkg.thankYouCardPrice === "number" ? pkg.thankYouCardPrice : 0.50,
    other_price: pkg.otherPrice,
    other_description: pkg.otherDescription || "",
    custom_addon_ids: pkg.customAddonIds || [],
    custom_items: pkg.customItems || [],
    updated_at: new Date().toISOString()
  };
  if (ownerId) row.owner_id = ownerId;
  return row;
}

// ============ PERSONALIZADOS (ADDONS) ============

export function rowToAddon(row: DbRow): CustomPackagingAddon {
  return {
    id: row.id,
    name: row.name,
    price: safeNumber(row.price, 0),
    description: row.description || "",
    enabledByDefault: Boolean(row.enabled_by_default)
  };
}

export function addonToRow(addon: CustomPackagingAddon, ownerId?: string | null): DbRow {
  const row: DbRow = {
    id: addon.id,
    name: addon.name,
    price: addon.price,
    description: addon.description || "",
    enabled_by_default: Boolean(addon.enabledByDefault),
    updated_at: new Date().toISOString()
  };
  if (ownerId) row.owner_id = ownerId;
  return row;
}
