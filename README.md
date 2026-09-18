# 🖨️ 3DPrice Master - Precificação Inteligente de Impressão 3D

Sistema web automatizado e intuitivo desenvolvido sob medida para oficinas, estúdios e lojas de impressão 3D, baseado e calibrado com a estrutura e cálculos exatos da sua planilha.

---

## ⚡ O que foi automatizado para você

1. **Importação Automática de Fatiador (Bambu Studio / OrcaSlicer / Cura / Prusa):**
   - Arraste seu arquivo `.gcode` ou `.3mf` para preencher o **peso em gramas** e o **tempo de impressão** em 1 segundo.
   - Ou cole qualquer texto do fatiador (ex: *"76g, 5h40min"*).

2. **Parser Inteligente de Tempo:**
   - Nunca mais calcule frações de hora na cabeça: aceita `5h40min`, `5:40`, `7h15`, `2h`, `25min`, `340min` e converte automaticamente para horas decimais e custo exato de energia.

3. **Cálculo de Lotes & Preço Unitário:**
   - Imprimiu 16 chaveiros juntos na mesa? O sistema calcula o custo total do lote e o custo **por unidade**, com tabelas de venda tanto para o pacote quanto para a unidade avulsa.

4. **Peça Única & Multi-Peças:**
   - Suporte a produtos com múltiplas partes (ex: Urso Natal com 3 partes de cores e tempos distintos).

5. **Precificação de Marketplaces (Shopee e Mercado Livre):**
   - Recomposição automática de preços para Shopee (comissão de 20% + taxa fixa de R$ 4,00).
   - O preço sugerido garante que você receba na sua conta o **mesmo lucro líquido** da venda direta.

6. **Simulador de Preço Livre & Metas de Lucro:**
   - Modo "Se eu vender por R$ X, quanto sobra limpo?".
   - Modo "Quero lucrar R$ Y limpo, por quanto devo anunciar?".

7. **Exportação para Excel (.xlsx) e WhatsApp:**
   - Exporta um catálogo completo consolidado e abas individuais formatadas como a sua planilha original.
   - Gera texto pronto de orçamento para copiar e enviar ao cliente no WhatsApp com 1 clique.

---

## 🚀 Como Executar

No terminal, dentro da pasta do projeto:

```bash
cd /Users/mibess/.gemini/antigravity/scratch/precificacao-3d
npm run dev
```

Abra o link exibido no navegador (normalmente `http://localhost:5173`).

---

## 📦 Produtos já Carregados no Sistema

O sistema já vem calibrado com os dados exatos da sua planilha original:
- **Rena Branca de Natal:** Custo R$ 13,23 | Shopee 20% = R$ 24,85
- **16 Chaveiros Labas:** Custo do Lote R$ 27,11 (R$ 1,69/un) | Shopee 100% = R$ 72,77
- **Urso Natal Tricô:** Custo R$ 4,56 | Shopee 50% = R$ 13,55
