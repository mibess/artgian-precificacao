/**
 * Script de Backup do Banco de Dados Supabase (Artgian Studio)
 * Executa download completo das tabelas em JSON e SQL para restauração.
 */

const fs = require("fs");
const path = require("path");

// Carregar variáveis do ambiente escolhido: APP_ENV=development|production (padrão: production)
function loadEnv() {
  const appEnv = process.env.APP_ENV === "development" ? "development" : "production";
  const envPath = path.resolve(process.cwd(), `.env.${appEnv}.local`);
  console.log(`Ambiente do backup: ${appEnv}`);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    }
  }
}

loadEnv();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("ERRO: Variáveis de ambiente SUPABASE_URL (ou VITE_SUPABASE_URL) e SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY) são obrigatórias.");
  console.error("Configure-as em .env.local ou nas variáveis do sistema.");
  process.exit(1);
}

async function fetchTable(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  if (!res.ok) {
    if (res.status === 404) {
      console.warn(`[Aviso] Tabela '${table}' ainda não existe no banco remoto (ignorado).`);
      return null;
    }
    throw new Error(`Falha ao buscar tabela '${table}': ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

async function runBackup() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  
  console.log(`\n======================================================`);
  console.log(`📦 INICIANDO BACKUP DO BANCO SUPABASE - ARTGIAN STUDIO`);
  console.log(`Timestamp: ${timestamp} | URL: ${url}`);
  console.log(`======================================================\n`);

  const tables = ["settings", "printers", "filaments", "packagings", "packaging_addons", "products"];
  const backupData = {
    metadata: {
      timestamp: now.toISOString(),
      source: url,
      version: "1.0",
      tablesBackedUp: []
    },
    tables: {}
  };

  const backupDir = path.resolve(process.cwd(), "supabase", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  let totalRows = 0;
  for (const table of tables) {
    try {
      const data = await fetchTable(table);
      if (data !== null) {
        backupData.tables[table] = data;
        backupData.metadata.tablesBackedUp.push(table);
        totalRows += data.length;
        console.log(`✓ Tabela '${table}': ${data.length} registros salvos.`);
      }
    } catch (e) {
      console.error(`✗ Erro ao extrair '${table}':`, e.message);
    }
  }

  if (totalRows === 0 && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`\n💡 Nota: Com o Row Level Security (RLS) ativo no Supabase, a chave anônima (anon key) não lê registros privados sem sessão de usuário.`);
    console.log(`   Para backups administrativos completos via terminal, configure SUPABASE_SERVICE_ROLE_KEY no seu .env.local.`);
  }

  // 1. Salvar JSON
  const jsonFileName = `backup_${timestamp}.json`;
  const jsonPath = path.join(backupDir, jsonFileName);
  fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), "utf8");
  console.log(`\n📄 Backup JSON salvo em: ${jsonPath}`);

  // 2. Salvar SQL restaurável
  let sql = `-- =========================================================\n`;
  sql += `-- BACKUP DO BANCO DE DADOS SUPABASE: ARTGIAN STUDIO\n`;
  sql += `-- Gerado em: ${now.toISOString()}\n`;
  sql += `-- Fonte: ${url}\n`;
  sql += `-- =========================================================\n\n`;

  for (const [table, rows] of Object.entries(backupData.tables)) {
    if (!rows || rows.length === 0) continue;
    sql += `-- ---------------------------------------------------------\n`;
    sql += `-- Tabela: public.${table} (${rows.length} registros)\n`;
    sql += `-- ---------------------------------------------------------\n`;
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = Object.values(row).map(v => {
        if (v === null || v === undefined) return "NULL";
        if (typeof v === "boolean" || typeof v === "number") return v;
        if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      sql += `INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT (id) DO UPDATE SET ${cols.map(c => `${c} = EXCLUDED.${c}`).join(", ")};\n`;
    }
    sql += "\n";
  }

  const sqlFileName = `backup_${timestamp}.sql`;
  const sqlPath = path.join(backupDir, sqlFileName);
  fs.writeFileSync(sqlPath, sql, "utf8");
  console.log(`📄 Backup SQL salvo em: ${sqlPath}`);

  console.log(`\n✅ Backup concluído com sucesso total!\n`);
}

runBackup().catch(err => {
  console.error("Erro fatal no backup:", err);
  process.exit(1);
});
