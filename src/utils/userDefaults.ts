import { Filament, Printer, PackagingItem, CustomPackagingAddon, ProductItem } from "../types/pricing";
import { defaultFilaments, defaultPrinters, defaultPackagings, defaultCustomPackagingAddons } from "../data/defaultData";

/**
 * Os insumos padrão têm ids fixos ("fil-1", "prn-a1"...). Como o id é chave primária
 * compartilhada entre todos os usuários, o segundo usuário a salvar esses padrões colidiria
 * com o registro do primeiro e o RLS bloquearia a gravação. Por isso, quando a nuvem não tem
 * nenhum item de uma coleção, os padrões recebem um sufixo determinístico do usuário.
 */
export function scopeDefaultId(id: string, userId: string): string {
  return `${id}-${userId.replace(/-/g, "").slice(0, 8)}`;
}

export interface UserCollections {
  filaments: Filament[];
  printers: Printer[];
  packagings: PackagingItem[];
  customAddons: CustomPackagingAddon[];
}

function withScopedIds<T extends { id: string }>(items: T[], userId: string | null, idMap: Map<string, string>): T[] {
  if (!userId) return items.map(item => ({ ...item }));
  return items.map(item => {
    const scopedId = scopeDefaultId(item.id, userId);
    idMap.set(item.id, scopedId);
    return { ...item, id: scopedId };
  });
}

/**
 * Usa as coleções da nuvem quando existirem; coleções vazias recebem os padrões com ids do usuário.
 * Retorna também o mapa "id padrão -> id do usuário" para religar referências antigas dos produtos.
 */
export function resolveUserCollections(
  cloud: UserCollections,
  userId: string | null
): { collections: UserCollections; idMap: Map<string, string> } {
  const idMap = new Map<string, string>();

  const filaments = cloud.filaments.length > 0 ? cloud.filaments : withScopedIds(defaultFilaments, userId, idMap);
  const printers = cloud.printers.length > 0 ? cloud.printers : withScopedIds(defaultPrinters, userId, idMap);
  const customAddons = cloud.customAddons.length > 0
    ? cloud.customAddons
    : withScopedIds(defaultCustomPackagingAddons, userId, idMap);
  const packagings = cloud.packagings.length > 0
    ? cloud.packagings
    : withScopedIds(defaultPackagings, userId, idMap).map(pkg => ({
        ...pkg,
        customAddonIds: pkg.customAddonIds?.map(id => idMap.get(id) ?? id)
      }));

  return { collections: { filaments, printers, packagings, customAddons }, idMap };
}

/** Religa filamento/impressora/embalagem de produtos que apontavam para ids padrão substituídos. */
export function remapProductReferences(products: ProductItem[], idMap: Map<string, string>): ProductItem[] {
  if (idMap.size === 0) return products;
  const remap = (id?: string | null) => (id && idMap.has(id) ? idMap.get(id)! : id);

  return products.map(product => {
    const packagingId = remap(product.packagingId) ?? null;
    let changed = packagingId !== (product.packagingId ?? null);
    const parts = product.parts.map(part => {
      const filamentId = remap(part.filamentId) || undefined;
      const printerId = remap(part.printerId) || undefined;
      if (filamentId === part.filamentId && printerId === part.printerId) return part;
      changed = true;
      return { ...part, filamentId, printerId };
    });
    return changed ? { ...product, packagingId, parts } : product;
  });
}
