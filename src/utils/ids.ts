/**
 * Gera ids únicos globalmente (as tabelas usam `id text primary key` compartilhado entre usuários).
 * Mantém o prefixo legível usado no restante do sistema (ex.: "prod-", "fil-", "part-").
 */
export function createId(prefix: string): string {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}
