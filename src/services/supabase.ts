import { createClient, SupabaseClient, User, Session, AuthChangeEvent, PostgrestError } from "@supabase/supabase-js";
import { ProductItem, GlobalSettings, Filament, Printer, PackagingItem, CustomPackagingAddon } from "../types/pricing";
import { defaultProducts, defaultSettings, defaultFilaments, defaultPrinters, defaultPackagings, defaultCustomPackagingAddons } from "../data/defaultData";
import {
  DbRow,
  OPTIONAL_COLUMNS,
  rowToProduct,
  productToRow,
  rowToSettings,
  settingsToRow,
  rowToFilament,
  filamentToRow,
  rowToPrinter,
  printerToRow,
  rowToPackaging,
  packagingToRow,
  rowToAddon,
  addonToRow
} from "./mappers";

export { safeNumber } from "./mappers";

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

/** Valida a sessão no servidor de autenticação (uso na abertura do app). */
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

/**
 * Id do usuário da sessão local, sem ida ao servidor de autenticação.
 * Usado apenas para filtrar/gravar owner_id: quem garante o isolamento é o RLS no banco.
 */
async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch {
    return null;
  }
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  const supabase = getSupabase();
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ==========================================
// INFRAESTRUTURA DE CONSULTAS
// ==========================================

/** Colunas que um banco legado pode não ter e que podem ser omitidas sem perder o registro. */
const LEGACY_COLUMNS: Record<string, string[]> = {
  products: ["packaging_id", "is_custom_packaging_cost", "owner_id"],
  filaments: ["owner_id"],
  printers: ["owner_id"],
  settings: ["owner_id"],
  packagings: ["thank_you_card_price", "custom_addon_ids", "owner_id"],
  packaging_addons: ["owner_id"]
};

const MIGRATION_HINT = "supabase/migrations/20261005_cost_fields.sql";
const knownMissingColumns = new Set<string>();
let pendingSchemaWarning: string | null = null;

/**
 * Retorna (uma única vez) o aviso de que o banco ainda não tem colunas novas,
 * para a interface orientar a execução da migration.
 */
export function consumeSchemaWarning(): string | null {
  const warning = pendingSchemaWarning;
  pendingSchemaWarning = null;
  return warning;
}

function isMissingColumnError(error: PostgrestError | null): boolean {
  return Boolean(error) && (error!.code === "PGRST204" || error!.code === "42703");
}

function isMissingTableError(error: PostgrestError | null): boolean {
  return Boolean(error) && (error!.code === "PGRST205" || error!.code === "42P01");
}

/** Extrai o nome da coluna das mensagens do PostgREST ("'x' column") e do Postgres ('column "x"'). */
function extractMissingColumn(error: PostgrestError): string | null {
  const match = (error.message || "").match(/'([\w]+)' column|column "?([\w]+)"? (?:of relation|does not exist)/i);
  if (match) return match[1] || match[2] || null;
  return (error.message || "").includes("owner_id") ? "owner_id" : null;
}

function stripColumns(rows: DbRow[], columns: Iterable<string>): DbRow[] {
  const cols = Array.from(columns);
  if (cols.length === 0) return rows;
  return rows.map(row => {
    const copy = { ...row };
    for (const c of cols) delete copy[c];
    return copy;
  });
}

function knownMissingFor(table: string): string[] {
  return (OPTIONAL_COLUMNS[table] || []).filter(c => knownMissingColumns.has(`${table}.${c}`));
}

/**
 * Upsert com degradação graciosa: se o banco não tiver uma coluna opcional (migration pendente)
 * ou legada, remove somente essa coluna e tenta de novo, preservando o restante dos dados.
 */
async function upsertRows(supabase: SupabaseClient, table: string, rows: DbRow[]): Promise<PostgrestError | null> {
  if (rows.length === 0) return null;

  const optional = OPTIONAL_COLUMNS[table] || [];
  const strippable = new Set([...optional, ...(LEGACY_COLUMNS[table] || [])]);
  let payload = stripColumns(rows, knownMissingFor(table));

  // Cada nova tentativa remove uma coluna presente no payload, então o laço sempre termina.
  for (;;) {
    const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
    if (!error) return null;
    if (!isMissingColumnError(error) && !(error.message || "").includes("owner_id")) return error;

    const column = extractMissingColumn(error);
    if (!column || !strippable.has(column) || !payload.some(r => column in r)) return error;

    if (optional.includes(column)) {
      knownMissingColumns.add(`${table}.${column}`);
      const missing = knownMissingFor(table).join(", ");
      pendingSchemaWarning = `O banco ainda não tem as colunas novas (${missing}). Execute ${MIGRATION_HINT} no SQL Editor do Supabase para que esses valores sejam salvos.`;
      console.warn(`[Supabase] Coluna '${table}.${column}' ausente. Execute ${MIGRATION_HINT}.`);
    }
    payload = stripColumns(payload, [column]);
  }
}

/** Busca as linhas visíveis ao usuário (próprias + legadas sem dono), com fallback para banco sem owner_id. */
async function selectOwnedRows(
  supabase: SupabaseClient,
  table: string,
  orderBy: string,
  ascending: boolean,
  userId: string | null
): Promise<{ data: DbRow[] | null; error: PostgrestError | null }> {
  let query = supabase.from(table).select("*").order(orderBy, { ascending });
  if (userId) {
    query = query.or(`owner_id.eq.${userId},owner_id.is.null`);
  }

  let { data, error } = await query;
  if (error && (error.code === "42703" || error.message?.includes("owner_id"))) {
    const fallback = await supabase.from(table).select("*").order(orderBy, { ascending });
    data = fallback.data;
    error = fallback.error;
  }
  return { data, error };
}

/**
 * Remove do banco os registros do usuário que não estão mais na lista local.
 * Sem usuário identificado não há exclusão (evita apagar dados de forma ampla).
 */
async function deleteRowsNotIn(supabase: SupabaseClient, table: string, keepIds: string[], userId: string | null): Promise<boolean> {
  if (!userId) return true;

  const notInList = `(${keepIds.map(id => `"${id}"`).join(",")})`;
  let query = supabase.from(table).delete().eq("owner_id", userId);
  if (keepIds.length > 0) {
    query = query.not("id", "in", notInList);
  }

  let { error } = await query;

  // Banco legado sem owner_id: mantém o comportamento antigo (só exclui o que saiu da lista).
  if (error && error.code === "42703" && keepIds.length > 0) {
    ({ error } = await supabase.from(table).delete().not("id", "in", notInList));
  }

  if (error) {
    console.error(`[Supabase] Erro ao remover itens excluídos de '${table}':`, error.message);
    return false;
  }
  return true;
}

/** Substitui a coleção do usuário pela lista local (upsert + remoção dos itens excluídos). */
async function replaceCollection<T extends { id: string }>(
  table: string,
  items: T[],
  toRow: (item: T, ownerId?: string | null) => DbRow
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const userId = await getCurrentUserId();
    const error = await upsertRows(supabase, table, items.map(item => toRow(item, userId)));
    if (error) {
      console.error(`[Supabase] Erro ao salvar '${table}':`, error.message);
      return false;
    }
    return await deleteRowsNotIn(supabase, table, items.map(i => i.id), userId);
  } catch (err) {
    console.error(`[Supabase] Falha ao salvar '${table}':`, err);
    return false;
  }
}

/** Lê uma coleção do usuário. `null` indica falha (rede/permissão); tabela inexistente conta como vazia. */
async function fetchCollection<T>(
  table: string,
  orderBy: string,
  ascending: boolean,
  fromRow: (row: DbRow) => T
): Promise<T[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const userId = await getCurrentUserId();
    const { data, error } = await selectOwnedRows(supabase, table, orderBy, ascending, userId);
    if (error) {
      if (isMissingTableError(error)) return [];
      console.warn(`[Supabase] Erro ao buscar '${table}':`, error.message);
      return null;
    }
    return (data || []).map(fromRow);
  } catch (err) {
    console.warn(`[Supabase] Falha de conexão ao buscar '${table}':`, err);
    return null;
  }
}

// ==========================================
// PRODUTOS
// ==========================================

export function fetchProductsFromCloud(): Promise<ProductItem[] | null> {
  return fetchCollection("products", "created_at", false, rowToProduct);
}

export async function saveProductToCloud(product: ProductItem): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const userId = await getCurrentUserId();
    const error = await upsertRows(supabase, "products", [productToRow(product, userId)]);
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
// FILAMENTOS, IMPRESSORAS, EMBALAGENS E PERSONALIZADOS
// ==========================================

export function fetchFilamentsFromCloud(): Promise<Filament[] | null> {
  return fetchCollection("filaments", "created_at", true, rowToFilament);
}

export function saveAllFilamentsToCloud(filaments: Filament[]): Promise<boolean> {
  return replaceCollection("filaments", filaments, filamentToRow);
}

export function fetchPrintersFromCloud(): Promise<Printer[] | null> {
  return fetchCollection("printers", "created_at", true, rowToPrinter);
}

export function saveAllPrintersToCloud(printers: Printer[]): Promise<boolean> {
  return replaceCollection("printers", printers, printerToRow);
}

export function fetchPackagingsFromCloud(): Promise<PackagingItem[] | null> {
  return fetchCollection("packagings", "created_at", true, rowToPackaging);
}

export function saveAllPackagingsToCloud(packagings: PackagingItem[]): Promise<boolean> {
  return replaceCollection("packagings", packagings, packagingToRow);
}

export function fetchCustomAddonsFromCloud(): Promise<CustomPackagingAddon[] | null> {
  return fetchCollection("packaging_addons", "name", true, rowToAddon);
}

export function saveAllCustomAddonsToCloud(addons: CustomPackagingAddon[]): Promise<boolean> {
  return replaceCollection("packaging_addons", addons, addonToRow);
}

// ==========================================
// CONFIGURAÇÕES GLOBAIS
// ==========================================

/** Registro de configurações mais recente do usuário (tolera linhas duplicadas de versões antigas). */
async function selectLatestUserSettings(
  supabase: SupabaseClient,
  userId: string,
  columns: string
): Promise<{ data: DbRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("settings")
    .select(columns)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);
  return { data: (data as DbRow[] | null)?.[0] ?? null, error };
}

/**
 * Configurações do usuário. Retorna `null` quando ainda não existem (usuário novo)
 * e lança erro em falha de rede/permissão, para não confundir "vazio" com "falhou".
 */
export async function fetchSettingsFromCloud(): Promise<GlobalSettings | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const userId = await getCurrentUserId();
  let data: DbRow | null = null;

  if (userId) {
    const userRes = await selectLatestUserSettings(supabase, userId, "*");
    if (userRes.error && userRes.error.code !== "42703") {
      throw new Error(`Erro ao buscar configurações: ${userRes.error.message}`);
    }
    data = userRes.data;
  }

  if (!data) {
    const defaultRes = await supabase.from("settings").select("*").eq("id", "default").maybeSingle();
    if (defaultRes.error) {
      throw new Error(`Erro ao buscar configurações: ${defaultRes.error.message}`);
    }
    data = defaultRes.data;
  }

  return data ? rowToSettings(data) : null;
}

export async function saveSettingsToCloud(settings: GlobalSettings): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const userId = await getCurrentUserId();

    // Descobre se o usuário já possui um registro de configurações
    let targetId = userId ? `settings-${userId}` : "default";
    if (userId) {
      const existing = await selectLatestUserSettings(supabase, userId, "id");
      if (existing.data?.id) {
        targetId = existing.data.id;
      }
    }

    let error = await upsertRows(supabase, "settings", [settingsToRow(settings, targetId, userId)]);

    // Fallback se o id personalizado der conflito em banco legado
    if (error && error.code === "23505") {
      error = await upsertRows(supabase, "settings", [settingsToRow(settings, "default", null)]);
    }

    if (error) {
      console.error("[Supabase] Erro ao salvar configurações:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Supabase] Falha ao salvar configurações:", err);
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
    const results = await Promise.all([
      saveAllFilamentsToCloud(defaultFilaments),
      saveAllPrintersToCloud(defaultPrinters),
      saveAllPackagingsToCloud(defaultPackagings),
      saveAllCustomAddonsToCloud(defaultCustomPackagingAddons),
      saveSettingsToCloud(defaultSettings)
    ]);
    return results.every(Boolean);
  } catch {
    return false;
  }
}
