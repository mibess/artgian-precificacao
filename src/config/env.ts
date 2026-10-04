/**
 * Ambiente da aplicação. Definido pelo modo do Vite:
 *  - `npm run dev`   -> "development" (banco de DESENVOLVIMENTO na nuvem)
 *  - `npm run build` -> "production"  (banco de PRODUÇÃO na nuvem)
 * As credenciais de cada ambiente ficam em `.env.development.local` e `.env.production.local`.
 */
export const APP_ENV: "development" | "production" =
  import.meta.env.MODE === "production" ? "production" : "development";

export const IS_DEV = APP_ENV === "development";
