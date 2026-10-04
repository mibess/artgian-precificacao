import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
});
