import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Em `npm run dev` não existe a Vercel servindo /api: este plugin executa o mesmo handler
 * (api/product-images.ts) dentro do servidor do Vite, lendo as variáveis de .env.development.local.
 */
function devApiPlugin(mode: string): Plugin {
  return {
    name: "dev-api-product-images",
    apply: "serve",
    configureServer(server) {
      Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
      server.middlewares.use("/api/product-images", async (req, res) => {
        try {
          const handlers = await server.ssrLoadModule("/api/product-images.ts");
          const handler = handlers[req.method || "GET"];
          if (!handler) {
            res.statusCode = 405;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const response: Response = await handler(new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === "GET" || req.method === "HEAD" ? undefined : body
          }));
          res.statusCode = response.status;
          response.headers.forEach((value, name) => res.setHeader(name, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          console.error("[dev-api] erro:", err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Erro interno no handler de imagens." }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), devApiPlugin(mode)],
  server: {
    port: 5173,
    host: true
  },
  build: {
    rolldownOptions: {
      output: {
        // Bibliotecas estáveis em chunks próprios: continuam em cache no navegador entre deploys do app.
        // (xlsx e jszip não entram aqui: são carregados sob demanda na exportação/importação.)
        codeSplitting: {
          groups: [
            { name: "react-vendor", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: "supabase-vendor", test: /node_modules[\\/]@supabase[\\/]/ }
          ]
        }
      }
    }
  }
}));
