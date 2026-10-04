# 🖨️ Artgian Precificação 3D

Sistema web profissional de precificação e gestão financeira para impressão 3D (FDM). Desenvolvido sob medida para oficinas, estúdios e fabricantes, integrando cálculo de custos operacionais, sincronização na nuvem via Supabase com autenticação e isolamento multiusuário (RLS), suporte a fatiadores e recomposição de preços para marketplaces.

---

## 🚀 Tecnologias

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React
- **Banco & Autenticação:** Supabase (PostgreSQL + Supabase Auth + Row-Level Security)
- **Exportação & Arquivos:** JSZip, ExcelJS, FileSaver
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
   - Reconciliação inteligente com LocalStorage por timestamp (`updatedAt`) com feedback via Toasts.
   - Proteção contra exclusão acidental em cascata de filamentos ou impressoras em uso.

---

## 🛠️ Instalação e Execução

### 1. Clonar o repositório e instalar dependências

```bash
git clone https://github.com/seu-usuario/artgian-precificacao.git
cd artgian-precificacao
npm install
```

### 2. Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto a partir do exemplo:

```bash
cp .env.example .env
```

Preencha com as credenciais do seu projeto Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 3. Rodar as migrações do banco no Supabase

Execute o script SQL localizado em:
`supabase/migrations/20261004_auth_and_rls.sql`

Ele cria as tabelas com suporte a multiusuário (`owner_id`), constraints de integridade e ativa o Row Level Security (RLS).

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
- `test/slicerParser.test.ts`: Parsers de G-code do Bambu/Orca/Cura/Prusa, conversão de metros e pacotes multi-plate `.3mf`.

---

## 💾 Rotina de Backup

O script de backup exporta todo o banco em formato JSON estruturado e script SQL de restauração:

```bash
npm run backup
```

Os backups são gravados automaticamente na pasta `supabase/backups/`.

---

## 📁 Estrutura de Pastas

```
├── src/
│   ├── components/       # Componentes da interface (ProductEditor, SettingsView, LoginScreen, etc.)
│   ├── services/         # Integração com Supabase (Auth, CRUD, Sincronização)
│   ├── types/            # Tipagens TypeScript (pricing, filamentos, impressoras, embalagens)
│   ├── utils/            # Utilitários de cálculo (calculator, timeParser, slicerParser, excelIO)
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
