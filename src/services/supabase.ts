import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { ProductItem, GlobalSettings, Filament, Printer, PackagingItem, CustomPackagingAddon } from "../types/pricing";
import { defaultProducts, defaultSettings, defaultFilaments, defaultPrinters, defaultPackagings, defaultCustomPackagingAddons } from "../data/defaultData";

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
    supabaseClientInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return supabaseClientInstance;
};

/**
 * Converte valor numérico com segurança: se for 0, respeita 0 e não substitui por fallback.
 */
export function safeNumber(val: any, fallback: number): number {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

// ==========================================
// AUTENTICAÇÃO SUPABASE
// ==========================================

export async function signInWithEmail(email: string, pass: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase não configurado.");
  return await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
}

export async function signUpWithEmail(email: string, pass: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase não configurado.");
  return await supabase.auth.signUp({ email: email.trim(), password: pass });
}

export async function signOutFromCloud(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const supabase = getSupabase();
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ==========================================
// PRODUTOS
// ==========================================

export async function fetchProductsFromCloud(): Promise<ProductItem[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const user = await getCurrentUser();
    let query = supabase.from("products").select("*").order("created_at", { ascending: false });
    if (user?.id) {
      query = query.or(`owner_id.eq.${user.id},owner_id.is.null`);
    }

    let { data, error } = await query;

    if (error && (error.code === "42703" || error.message?.includes("owner_id"))) {
      const fallback = await supabase.from("products").select("*").order("created_at", { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.warn("[Supabase] Erro ao buscar produtos:", error.message);
      return null;
    }

    if (!data) return [];

    return data.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category || "Geral",
      quantityInBatch: safeNumber(row.quantity_in_batch, 1),
      isMultiPart: Boolean(row.is_multi_part),
      parts: Array.isArray(row.parts) ? row.parts : [],
      packagingCost: safeNumber(row.packaging_cost, 0),
      packagingId: row.packaging_id || null,
      isCustomPackagingCost: Boolean(row.is_custom_packaging_cost),
      accessoriesCost: safeNumber(row.accessories_cost, 0),
      variableCostPercent: row.variable_cost_percent !== null && row.variable_cost_percent !== undefined
        ? safeNumber(row.variable_cost_percent, 10)
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
    const user = await getCurrentUser();
    const payload: any = {
      id: product.id,
      name: product.name,
      category: product.category,
      quantity_in_batch: product.quantityInBatch,
      is_multi_part: product.isMultiPart,
      parts: product.parts,
      packaging_cost: product.packagingCost,
      packaging_id: product.packagingId || null,
      is_custom_packaging_cost: Boolean(product.isCustomPackagingCost),
      accessories_cost: product.accessoriesCost,
      variable_cost_percent: typeof product.variableCostPercent === "number" ? product.variableCostPercent : null,
      notes: product.notes || "",
      created_at: product.createdAt,
      updated_at: new Date().toISOString()
    };

    if (user?.id) {
      payload.owner_id = user.id;
    }

    let { error } = await supabase
      .from("products")
      .upsert(payload, { onConflict: "id" });

    // Fallback se colunas ainda não existirem no schema remoto
    if (error && (error.code === "PGRST204" || error.code === "42703" || error.message?.includes("owner_id"))) {
      delete payload.packaging_id;
      delete payload.is_custom_packaging_cost;
      delete payload.owner_id;
      const retry = await supabase
        .from("products")
        .upsert(payload, { onConflict: "id" });
      error = retry.error;
    }

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
    const user = await getCurrentUser();
    let query = supabase.from("filaments").select("*").order("created_at", { ascending: true });
    if (user?.id) {
      query = query.or(`owner_id.eq.${user.id},owner_id.is.null`);
    }

    let { data, error } = await query;
    if (error && (error.code === "42703" || error.message?.includes("owner_id"))) {
      const fallback = await supabase.from("filaments").select("*").order("created_at", { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) return null;

    return data.map(row => ({
      id: row.id,
      name: row.name,
      brand: row.brand || "Padrão",
      material: row.material || "PLA",
      pricePerKg: safeNumber(row.price_per_kg, 105.00),
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
    const user = await getCurrentUser();
    const payload: any = {
      id: filament.id,
      name: filament.name,
      brand: filament.brand,
      material: filament.material,
      price_per_kg: filament.pricePerKg,
      color_name: filament.colorName || "",
      color_hex: filament.colorHex || "#ffffff"
    };
    if (user?.id) payload.owner_id = user.id;

    let { error } = await supabase
      .from("filaments")
      .upsert(payload, { onConflict: "id" });

    if (error && (error.code === "PGRST204" || error.code === "42703" || error.message?.includes("owner_id"))) {
      delete payload.owner_id;
      const retry = await supabase.from("filaments").upsert(payload, { onConflict: "id" });
      error = retry.error;
    }

    return !error;
  } catch {
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
  } catch {
    return false;
  }
}

export async function saveAllFilamentsToCloud(filaments: Filament[]): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const user = await getCurrentUser();
    const payload = filaments.map(filament => ({
      id: filament.id,
      name: filament.name,
      brand: filament.brand,
      material: filament.material,
      price_per_kg: filament.pricePerKg,
      color_name: filament.colorName || "",
      color_hex: filament.colorHex || "#ffffff",
      ...(user?.id ? { owner_id: user.id } : {})
    }));

    // Upsert nos itens atuais
    if (payload.length > 0) {
      const { error } = await supabase
        .from("filaments")
        .upsert(payload, { onConflict: "id" });
      if (error) return false;
    }

    // Deletar itens que não estão mais presentes na lista
    const currentIds = filaments.map(f => f.id);
    let delQuery = supabase.from("filaments").delete();
    if (user?.id) {
      delQuery = delQuery.eq("owner_id", user.id);
    }
    if (currentIds.length > 0) {
      await delQuery.not("id", "in", `(${currentIds.map(id => `"${id}"`).join(",")})`);
    }

    return true;
  } catch {
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
    const user = await getCurrentUser();
    let query = supabase.from("printers").select("*").order("created_at", { ascending: true });
    if (user?.id) {
      query = query.or(`owner_id.eq.${user.id},owner_id.is.null`);
    }

    let { data, error } = await query;
    if (error && (error.code === "42703" || error.message?.includes("owner_id"))) {
      const fallback = await supabase.from("printers").select("*").order("created_at", { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) return null;

    return data.map(row => ({
      id: row.id,
      name: row.name,
      powerWatts: safeNumber(row.power_watts, 110),
      notes: row.notes || ""
    }));
  } catch {
    return null;
  }
}

export async function savePrinterToCloud(printer: Printer): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const user = await getCurrentUser();
    const payload: any = {
      id: printer.id,
      name: printer.name,
      power_watts: printer.powerWatts,
      notes: printer.notes || ""
    };
    if (user?.id) payload.owner_id = user.id;

    let { error } = await supabase
      .from("printers")
      .upsert(payload, { onConflict: "id" });

    if (error && (error.code === "PGRST204" || error.code === "42703" || error.message?.includes("owner_id"))) {
      delete payload.owner_id;
      const retry = await supabase.from("printers").upsert(payload, { onConflict: "id" });
      error = retry.error;
    }

    return !error;
  } catch {
    return false;
  }
}

export async function saveAllPrintersToCloud(printers: Printer[]): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const user = await getCurrentUser();
    const payload = printers.map(printer => ({
      id: printer.id,
      name: printer.name,
      power_watts: printer.powerWatts,
      notes: printer.notes || "",
      ...(user?.id ? { owner_id: user.id } : {})
    }));

    if (payload.length > 0) {
      const { error } = await supabase
        .from("printers")
        .upsert(payload, { onConflict: "id" });
      if (error) return false;
    }

    const currentIds = printers.map(p => p.id);
    let delQuery = supabase.from("printers").delete();
    if (user?.id) {
      delQuery = delQuery.eq("owner_id", user.id);
    }
    if (currentIds.length > 0) {
      await delQuery.not("id", "in", `(${currentIds.map(id => `"${id}"`).join(",")})`);
    }

    return true;
  } catch {
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
  } catch {
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
    const user = await getCurrentUser();
    let data: any = null;
    let error: any = null;

    if (user?.id) {
      const userRes = await supabase.from("settings").select("*").eq("owner_id", user.id).maybeSingle();
      if (userRes.data) {
        data = userRes.data;
      } else if (userRes.error && userRes.error.code !== "42703") {
        error = userRes.error;
      }
    }

    if (!data && !error) {
      const defaultRes = await supabase.from("settings").select("*").eq("id", "default").maybeSingle();
      data = defaultRes.data;
      error = defaultRes.error;
    }

    if (error || !data) return null;

    return {
      energyKwhPrice: safeNumber(data.energy_kwh_price, 1.02),
      defaultFilamentPricePerKg: safeNumber(data.default_filament_price_per_kg, 105.00),
      defaultPrinterWatts: safeNumber(data.default_printer_watts, 110),
      defaultVariableCostPercent: safeNumber(data.default_variable_cost_percent, 10),
      marketplaces: Array.isArray(data.marketplaces) ? data.marketplaces : defaultSettings.marketplaces
    };
  } catch {
    return null;
  }
}

export async function saveSettingsToCloud(settings: GlobalSettings): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const user = await getCurrentUser();
    
    // Descobre se o usuário já possui um registro de configurações
    let targetId = user?.id ? `settings-${user.id}` : "default";
    if (user?.id) {
      const existing = await supabase.from("settings").select("id").eq("owner_id", user.id).maybeSingle();
      if (existing?.data?.id) {
        targetId = existing.data.id;
      }
    }

    const payload: any = {
      id: targetId,
      energy_kwh_price: settings.energyKwhPrice,
      default_filament_price_per_kg: settings.defaultFilamentPricePerKg,
      default_printer_watts: settings.defaultPrinterWatts,
      default_variable_cost_percent: settings.defaultVariableCostPercent,
      marketplaces: settings.marketplaces,
      updated_at: new Date().toISOString()
    };
    if (user?.id) payload.owner_id = user.id;

    let { error } = await supabase
      .from("settings")
      .upsert(payload, { onConflict: "id" });

    // Fallback se id personalizado der conflito em banco legado ou não tiver owner_id
    if (error && (error.code === "23505" || error.code === "42703" || error.message?.includes("owner_id"))) {
      payload.id = "default";
      delete payload.owner_id;
      const retry = await supabase.from("settings").upsert(payload, { onConflict: "id" });
      error = retry.error;
    }

    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// EMBALAGENS (PACKAGINGS)
// ==========================================

export async function fetchPackagingsFromCloud(): Promise<PackagingItem[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const user = await getCurrentUser();
    let query = supabase.from("packagings").select("*").order("created_at", { ascending: true });
    if (user?.id) {
      query = query.or(`owner_id.eq.${user.id},owner_id.is.null`);
    }

    let { data, error } = await query;
    if (error && (error.code === "42703" || error.message?.includes("owner_id"))) {
      const fallback = await supabase.from("packagings").select("*").order("created_at", { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      if (error.code !== "PGRST205") {
        console.warn("[Supabase] Erro ao buscar embalagens:", error.message);
      }
      return null;
    }

    if (!data) return [];

    return data.map(row => ({
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
    }));
  } catch {
    return null;
  }
}

export async function savePackagingToCloud(pkg: PackagingItem): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const user = await getCurrentUser();
    const payload: any = {
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
    if (user?.id) payload.owner_id = user.id;

    let { error } = await supabase
      .from("packagings")
      .upsert(payload, { onConflict: "id" });

    if (error && (error.code === "PGRST204" || error.code === "42703" || error.message?.includes("owner_id"))) {
      delete payload.thank_you_card_price;
      delete payload.custom_addon_ids;
      delete payload.owner_id;
      const retry = await supabase.from("packagings").upsert(payload, { onConflict: "id" });
      error = retry.error;
    }

    return !error;
  } catch {
    return false;
  }
}

export async function saveAllPackagingsToCloud(packagings: PackagingItem[]): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const user = await getCurrentUser();
    const payload = packagings.map(pkg => ({
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
      updated_at: new Date().toISOString(),
      ...(user?.id ? { owner_id: user.id } : {})
    }));

    if (payload.length > 0) {
      let { error } = await supabase
        .from("packagings")
        .upsert(payload, { onConflict: "id" });

      if (error && (error.code === "PGRST204" || error.code === "42703" || error.message?.includes("owner_id"))) {
        const fallback = payload.map(p => {
          const c: any = { ...p };
          delete c.thank_you_card_price;
          delete c.custom_addon_ids;
          delete c.owner_id;
          return c;
        });
        const retry = await supabase.from("packagings").upsert(fallback, { onConflict: "id" });
        error = retry.error;
      }
      if (error) return false;
    }

    const currentIds = packagings.map(p => p.id);
    let delQuery = supabase.from("packagings").delete();
    if (user?.id) {
      delQuery = delQuery.eq("owner_id", user.id);
    }
    if (currentIds.length > 0) {
      await delQuery.not("id", "in", `(${currentIds.map(id => `"${id}"`).join(",")})`);
    }

    return true;
  } catch {
    return false;
  }
}

export async function deletePackagingFromCloud(packagingId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("packagings")
      .delete()
      .eq("id", packagingId);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// ITENS PERSONALIZADOS GRAVADOS (ADDONS)
// ==========================================

export async function fetchCustomAddonsFromCloud(): Promise<CustomPackagingAddon[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const user = await getCurrentUser();
    let query = supabase.from("packaging_addons").select("*").order("name", { ascending: true });
    if (user?.id) {
      query = query.or(`owner_id.eq.${user.id},owner_id.is.null`);
    }

    let { data, error } = await query;
    if (error && (error.code === "42703" || error.message?.includes("owner_id"))) {
      const fallback = await supabase.from("packaging_addons").select("*").order("name", { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) return null;

    return data.map(row => ({
      id: row.id,
      name: row.name,
      price: safeNumber(row.price, 0),
      description: row.description || "",
      enabledByDefault: Boolean(row.enabled_by_default)
    }));
  } catch {
    return null;
  }
}

export async function saveAllCustomAddonsToCloud(addons: CustomPackagingAddon[]): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const user = await getCurrentUser();
    const payload = addons.map(a => ({
      id: a.id,
      name: a.name,
      price: a.price,
      description: a.description || "",
      enabled_by_default: Boolean(a.enabledByDefault),
      updated_at: new Date().toISOString(),
      ...(user?.id ? { owner_id: user.id } : {})
    }));

    if (payload.length > 0) {
      let { error } = await supabase
        .from("packaging_addons")
        .upsert(payload, { onConflict: "id" });

      if (error && (error.code === "PGRST204" || error.code === "42703" || error.message?.includes("owner_id"))) {
        const fallback = payload.map(p => {
          const c: any = { ...p };
          delete c.owner_id;
          return c;
        });
        const retry = await supabase.from("packaging_addons").upsert(fallback, { onConflict: "id" });
        error = retry.error;
      }
      if (error) return false;
    }

    const currentIds = addons.map(a => a.id);
    let delQuery = supabase.from("packaging_addons").delete();
    if (user?.id) {
      delQuery = delQuery.eq("owner_id", user.id);
    }
    if (currentIds.length > 0) {
      await delQuery.not("id", "in", `(${currentIds.map(id => `"${id}"`).join(",")})`);
    }

    return true;
  } catch {
    return false;
  }
}

// ==========================================
// SEED EXPLÍCITO (apenas sob demanda do usuário)
// ==========================================

export async function seedInitialDataToCloud(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    for (const prod of defaultProducts) {
      await saveProductToCloud(prod);
    }
    for (const fil of defaultFilaments) {
      await saveFilamentToCloud(fil);
    }
    for (const prn of defaultPrinters) {
      await savePrinterToCloud(prn);
    }
    await saveAllPackagingsToCloud(defaultPackagings);
    await saveSettingsToCloud(defaultSettings);
    return true;
  } catch {
    return false;
  }
}
