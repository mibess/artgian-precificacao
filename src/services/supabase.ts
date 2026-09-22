import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ProductItem, GlobalSettings, Filament, Printer } from "../types/pricing";
import { defaultProducts, defaultSettings, defaultFilaments, defaultPrinters } from "../data/defaultData";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("https://") &&
    !supabaseUrl.includes("your-project")
  );
};

let supabaseClientInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(supabaseUrl!, supabaseAnonKey!);
  }
  return supabaseClientInstance;
};

// ==========================================
// PRODUTOS
// ==========================================

export async function fetchProductsFromCloud(): Promise<ProductItem[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[Supabase] Erro ao buscar produtos:", error.message);
      return null;
    }

    if (!data || data.length === 0) {
      // Se a tabela estiver vazia, sincroniza com os dados iniciais
      await syncInitialDataToCloud();
      return defaultProducts;
    }

    return data.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category || "Geral",
      quantityInBatch: Number(row.quantity_in_batch) || 1,
      isMultiPart: Boolean(row.is_multi_part),
      parts: Array.isArray(row.parts) ? row.parts : [],
      packagingCost: Number(row.packaging_cost) || 0,
      accessoriesCost: Number(row.accessories_cost) || 0,
      variableCostPercent: row.variable_cost_percent !== null && row.variable_cost_percent !== undefined
        ? Number(row.variable_cost_percent)
        : null,
      notes: row.notes || "",
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn("[Supabase] Falha de conexão ao buscar produtos:", err);
    return null;
  }
}

export async function saveProductToCloud(product: ProductItem): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const payload = {
      id: product.id,
      name: product.name,
      category: product.category,
      quantity_in_batch: product.quantityInBatch,
      is_multi_part: product.isMultiPart,
      parts: product.parts,
      packaging_cost: product.packagingCost,
      accessories_cost: product.accessoriesCost,
      variable_cost_percent: typeof product.variableCostPercent === "number" ? product.variableCostPercent : null,
      notes: product.notes || "",
      created_at: product.createdAt,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("products")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("[Supabase] Erro ao salvar produto:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Supabase] Falha ao salvar produto:", err);
    return false;
  }
}

export async function deleteProductFromCloud(productId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("[Supabase] Erro ao excluir produto:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Supabase] Falha ao excluir produto:", err);
    return false;
  }
}

// ==========================================
// FILAMENTOS
// ==========================================

export async function fetchFilamentsFromCloud(): Promise<Filament[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("filaments")
      .select("*");

    if (error || !data || data.length === 0) return null;

    return data.map(row => ({
      id: row.id,
      name: row.name,
      brand: row.brand || "Padrão",
      material: row.material || "PLA",
      pricePerKg: Number(row.price_per_kg) || 105.00,
      colorName: row.color_name || undefined,
      colorHex: row.color_hex || "#ffffff"
    }));
  } catch (err) {
    console.warn("[Supabase] Falha ao buscar filamentos:", err);
    return null;
  }
}

export async function saveFilamentToCloud(filament: Filament): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("filaments")
      .upsert({
        id: filament.id,
        name: filament.name,
        brand: filament.brand,
        material: filament.material,
        price_per_kg: filament.pricePerKg,
        color_name: filament.colorName || "",
        color_hex: filament.colorHex || "#ffffff"
      }, { onConflict: "id" });

    return !error;
  } catch (err) {
    return false;
  }
}

export async function deleteFilamentFromCloud(filamentId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("filaments")
      .delete()
      .eq("id", filamentId);
    return !error;
  } catch (err) {
    return false;
  }
}

export async function saveAllFilamentsToCloud(filaments: Filament[]): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const payload = filaments.map(filament => ({
      id: filament.id,
      name: filament.name,
      brand: filament.brand,
      material: filament.material,
      price_per_kg: filament.pricePerKg,
      color_name: filament.colorName || "",
      color_hex: filament.colorHex || "#ffffff"
    }));

    const { error } = await supabase
      .from("filaments")
      .upsert(payload, { onConflict: "id" });

    return !error;
  } catch (err) {
    return false;
  }
}

// ==========================================
// IMPRESSORAS
// ==========================================

export async function fetchPrintersFromCloud(): Promise<Printer[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("printers")
      .select("*");

    if (error || !data || data.length === 0) return null;

    return data.map(row => ({
      id: row.id,
      name: row.name,
      powerWatts: Number(row.power_watts) || 110,
      notes: row.notes || ""
    }));
  } catch (err) {
    return null;
  }
}

export async function savePrinterToCloud(printer: Printer): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("printers")
      .upsert({
        id: printer.id,
        name: printer.name,
        power_watts: printer.powerWatts,
        notes: printer.notes || ""
      }, { onConflict: "id" });

    return !error;
  } catch (err) {
    return false;
  }
}

export async function saveAllPrintersToCloud(printers: Printer[]): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const payload = printers.map(printer => ({
      id: printer.id,
      name: printer.name,
      power_watts: printer.powerWatts,
      notes: printer.notes || ""
    }));

    const { error } = await supabase
      .from("printers")
      .upsert(payload, { onConflict: "id" });

    return !error;
  } catch (err) {
    return false;
  }
}

export async function deletePrinterFromCloud(printerId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("printers")
      .delete()
      .eq("id", printerId);
    return !error;
  } catch (err) {
    return false;
  }
}

// ==========================================
// CONFIGURAÇÕES GLOBAIS
// ==========================================

export async function fetchSettingsFromCloud(): Promise<GlobalSettings | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error || !data) return null;

    return {
      energyKwhPrice: Number(data.energy_kwh_price) || 1.02,
      defaultFilamentPricePerKg: Number(data.default_filament_price_per_kg) || 105.00,
      defaultPrinterWatts: Number(data.default_printer_watts) || 110,
      defaultVariableCostPercent: Number(data.default_variable_cost_percent) || 10,
      marketplaces: Array.isArray(data.marketplaces) ? data.marketplaces : defaultSettings.marketplaces
    };
  } catch (err) {
    return null;
  }
}

export async function saveSettingsToCloud(settings: GlobalSettings): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("settings")
      .upsert({
        id: "default",
        energy_kwh_price: settings.energyKwhPrice,
        default_filament_price_per_kg: settings.defaultFilamentPricePerKg,
        default_printer_watts: settings.defaultPrinterWatts,
        default_variable_cost_percent: settings.defaultVariableCostPercent,
        marketplaces: settings.marketplaces,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    return !error;
  } catch (err) {
    return false;
  }
}

// Sincronização inicial se banco estiver recém-criado
async function syncInitialDataToCloud() {
  const supabase = getSupabase();
  if (!supabase) return;

  for (const prod of defaultProducts) {
    await saveProductToCloud(prod);
  }
  for (const fil of defaultFilaments) {
    await saveFilamentToCloud(fil);
  }
  for (const prn of defaultPrinters) {
    await savePrinterToCloud(prn);
  }
  await saveSettingsToCloud(defaultSettings);
}
