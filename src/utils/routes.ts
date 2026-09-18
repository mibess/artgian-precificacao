export type TabType = "catalog" | "editor" | "simulator" | "settings";

export const TAB_ROUTES: Record<TabType, string> = {
  catalog: "/catalogo",
  editor: "/fatiador",
  simulator: "/simulador",
  settings: "/insumos"
};

/**
 * Converte o pathname atual do navegador para a aba correspondente.
 */
export function getTabFromPath(pathname: string): TabType {
  const clean = pathname.toLowerCase().replace(/\/+$/, "") || "/";

  if (clean === "/fatiador" || clean === "/editor" || clean === "/novo") {
    return "editor";
  }
  if (clean === "/simulador") {
    return "simulator";
  }
  if (clean === "/insumos" || clean === "/configuracoes" || clean === "/taxas") {
    return "settings";
  }
  return "catalog";
}

/**
 * Retorna o caminho de URL amigável para uma aba e opcionalmente id de produto.
 */
export function getPathForTab(tab: TabType, productId?: string | null): string {
  if (tab === "editor" && productId) {
    return `/fatiador?id=${encodeURIComponent(productId)}`;
  }
  return TAB_ROUTES[tab] || "/catalogo";
}

/**
 * Extrai o id do produto a partir de query params (?id=...)
 */
export function getProductIdFromSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search);
    return params.get("id");
  } catch {
    return null;
  }
}
