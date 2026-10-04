# 🖨️ Artgian Precificação 3D

Sistema web profissional de precificação e gestão financeira para impressão 3D (FDM). Desenvolvido sob medida para oficinas, estúdios e fabricantes, integrando cálculo de custos operacionais, sincronização na nuvem via Supabase com autenticação e isolamento multiusuário (RLS), suporte a fatiadores e recomposição de preços para marketplaces.

---

## 🚀 Tecnologias

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React
- **Banco & Autenticação:** Supabase (PostgreSQL + Supabase Auth + Row-Level Security)
- **Exportação & Arquivos:** JSZip (leitura de `.3mf`) e SheetJS/xlsx (exportação Excel), ambos carregados sob demanda
- **Testes Automatizados:** Vitest

---

## ⚡ Principais Funcionalidades

1. **Importação Direta de Fatiadores (.gcode / .3mf / Texto):**
   - **Bambu Studio & OrcaSlicer:** Leitura de metadados, placas multi-plate (`plate_*.gcode`), `slice_info.config` (XML real com tempos, gramas e quebra de filamentos por cor/AMS).
   - **PrusaSlicer & SuperSlicer:** Detecção por cabeçalho, tempos com dias/horas/minutos/segundos e filamento consumido.
   - **UltiMaker Cura:** Conversão automática de metros de filamento em gramas baseada na densidade do material (PLA, PETG, ABS, ASA, TPU, etc.) e detecção de múltiplos extrusores.
   - **MakerWorld / Bambu Handy:** Parser de texto colado da tela de impressão com detecção de AMS e partes coloridas.
   - **Leitura eficiente de arquivos gigantes:** Utiliza `File.slice()` para ler apenas cabeçalho e rodapé sem sobrecarregar a memória do navegador.

2. **Parser Avançado de Tempo:**
   - Suporta múltiplos formatos: `1d 2h 30m 15s`, `1 dia`, `5h40min`, `5:40`, `02:30:15`, `45min`, `15s`.
   - Validação estrita de relógio e alertas para números puros superiores a 24 horas.

3. **Cálculo Rigoroso de Precificação & Custos Operacionais:**
   - **Filamento:** Custo proporcional ao grama com base no preço do carretel (R$/kg).
   - **Energia:** Tarifa de energia (R$/kWh) × potência da impressora (W) × tempo de impressão.
   - **Depreciação de Máquina (Opcional):** R$/hora de amortização e manutenção preventiva.
   - **Mão de Obra (Opcional):** R$/hora de acabamento, pintura, pós-processamento e suporte.
   - **Custo Variável / Margem de Falha:** Taxa percentual configurável globalmente ou por produto para absorver refugos e testes.
   - **Embalagens & Acessórios:** Cálculo dinâmico de caixas com insumos de proteção (fita, plástico bolha, adesivos) e adicionais personalizados (cartões, sacolas).
   - **Lotes & Peça Única:** Cálculo tanto para o lote total na mesa quanto custo e tabelas unitárias.

4. **Recomposição de Preços para Marketplaces (Shopee, Mercado Livre, etc.):**
   - Suporte a comissão percentual, taxa fixa por item vendido, teto máximo de comissão (`commissionCap`) e faixa mínima de preço (`fixedFeeMinPrice`).
   - Calcula o preço exato que você deve cobrar no canal para que seu **lucro líquido em R$** seja idêntico ao da venda direta.

5. **Segurança & Sincronização Inteligente:**
   - Supabase Auth com login e cadastro via e-mail e senha.
   - Row Level Security (RLS) garantindo que cada usuário acesse apenas seus próprios produtos e configurações.
   - Nuvem como única fonte de verdade, com feedback de sucesso/erro via Toasts.
   - Proteção contra exclusão acidental em cascata de filamentos ou impressoras em uso.

---

## 🛠️ Instalação e Execução

### 1. Clonar o repositório e instalar dependências

```bash
git clone https://github.com/seu-usuario/artgian-precificacao.git
cd artgian-precificacao
npm install
```

### 2. Dois bancos na nuvem (desenvolvimento e produção)

A aplicação **não usa banco local nem LocalStorage para dados**: tudo vive no Supabase.
Existem exatamente dois projetos Supabase:

| Ambiente | Comando | Arquivo de credenciais | Banco |
|---|---|---|---|
| Desenvolvimento | `npm run dev` | `.env.development.local` | Projeto Supabase de **desenvolvimento** |
| Produção | `npm run build` / deploy | `.env.production.local` (ou variáveis do provedor, ex.: Vercel) | Projeto Supabase de **produção** |

Cada arquivo contém:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

Em desenvolvimento a barra superior exibe o selo **DEV**. Sem credenciais, o app mostra uma tela orientando a configurar o ambiente.

### 3. Criar o banco de desenvolvimento

1. Crie um novo projeto no Supabase (ex.: `artgian-precificacao-dev`).
2. No SQL Editor, execute **`supabase/setup_dev.sql`** (cria todas as tabelas com `owner_id` e RLS restrito).
3. Em *Authentication → Providers → Email*, desative "Confirm email" (facilita contas de teste).
4. Preencha `.env.development.local` com a URL e a anon key desse projeto.

O banco de produção segue o fluxo de migrações em `supabase/migrations/`.

### 3.1 Atualizar um banco existente (produção e desenvolvimento)

Execute no SQL Editor do Supabase, em cada ambiente, **`supabase/migrations/20261005_cost_fields.sql`**.
Ela adiciona as colunas de custo de máquina, mão de obra, regra de perda sobre embalagem
(configurações) e horas de mão de obra / embalagem por unidade (produtos). O script é idempotente.

Sem essa migration o app continua funcionando, mas esses campos não são gravados na nuvem:
ao salvar, um aviso "Atualização do banco pendente" orienta a executá-la.

### 4. Executar em desenvolvimento

```bash
npm run dev
```

Acesse no navegador: `http://localhost:5173`.

---

## 🧪 Testes Automatizados

A suíte de testes unitários utiliza **Vitest**:

```bash
# Executar todos os testes
npm test

# Executar modo interativo com watch
npx vitest
```

Os testes cobrem:
- `test/calculator.test.ts`: Fórmulas matemáticas de precificação, markup, margem, embalagem dinâmica e taxas de marketplace.
- `test/timeParser.test.ts`: Conversão de formatos de tempo, dias, segundos, relógio e validações.
- `test/slicerParser.test.ts`: Parsers de G-code do Bambu/Orca/Cura/Prusa, conversão de metros, pacotes multi-plate `.3mf` e G-codes grandes.
- `test/mappers.test.ts`: Conversão entre linhas do banco e tipos do app (incluindo bancos sem as colunas novas).
- `test/userDefaults.test.ts`: Insumos padrão com ids exclusivos por usuário (evita colisão entre contas no RLS).

---

## 💾 Rotina de Backup

O script de backup exporta todo o banco em formato JSON estruturado e script SQL de restauração:

```bash
npm run backup                        # produção (padrão)
APP_ENV=development npm run backup    # desenvolvimento
```

Os backups são gravados automaticamente na pasta `supabase/backups/`.

---

## 📁 Estrutura de Pastas

```
├── src/
│   ├── components/       # Componentes da interface (ProductEditor, SettingsView, LoginScreen, etc.)
│   ├── services/         # Integração com Supabase (Auth, CRUD, Sincronização) e mappers do banco
│   ├── types/            # Tipagens TypeScript (pricing, filamentos, impressoras, embalagens)
│   ├── utils/            # Cálculo, parsers, exportação Excel, ids e insumos padrão por usuário
│   └── App.tsx           # Componente raiz e reconciliação de estado
├── test/                 # Testes unitários de regressão
├── supabase/
│   ├── migrations/       # Scripts SQL versionados
│   └── backups/          # Snapshots de backup do banco
├── scripts/              # Scripts auxiliares (backup.cjs)
└── vitest.config.ts      # Configuração da suíte Vitest
```

---

## 📄 Licença

Propriedade de Artgian Studio. Todos os direitos reservados.
