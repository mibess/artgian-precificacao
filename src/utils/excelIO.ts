import * as XLSX from "xlsx";
import { ProductItem, GlobalSettings, Filament, Printer, PackagingItem, CustomPackagingAddon } from "../types/pricing";
import { calculatePricing, findMarginRow, getPrimaryMarketplace, describeMarketplaceFees } from "./calculator";

/**
 * Nome de aba válido e único (Excel: até 31 caracteres, sem : \\ / ? * [ ] e sem repetição).
 * Produtos com nomes iguais nos 30 primeiros caracteres geravam abas duplicadas e quebravam a exportação.
 */
export function uniqueSheetName(name: string, used: Set<string>): string {
  const base = (name || "PRODUTO").replace(/[:\\/?*\[\]]/g, "-").toUpperCase().slice(0, 31) || "PRODUTO";
  let candidate = base;
  let counter = 2;
  while (used.has(candidate)) {
    const suffix = ` (${counter++})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate);
  return candidate;
}

/**
 * Exporta catálogo completo e abas individuais de cada produto em formato Excel (.xlsx)
 */
export function exportToExcel(
  products: ProductItem[],
  settings: GlobalSettings,
  filaments: Filament[],
  printers: Printer[],
  packagings: PackagingItem[] = [],
  customAddons: CustomPackagingAddon[] = []
) {
  const wb = XLSX.utils.book_new();
  const marketplace = getPrimaryMarketplace(settings);
  const mpName = marketplace?.name || "Marketplace";

  // Cálculo único por produto (reaproveitado no resumo e nas abas individuais)
  const pricingById = new Map(products.map(prod => [
    prod.id,
    calculatePricing(prod, settings, filaments, printers, packagings, customAddons)
  ]));

  // 1. Aba Resumo / Catálogo Consolidado
  const summaryHeader: any[] = [
    "Produto",
    "Categoria",
    "Qtd no Lote",
    "Peso (g)",
    "Tempo de Impressão",
    "Custo Filamento (R$)",
    "Custo Energia (R$)",
    "Máquina (R$)",
    "Mão de Obra (R$)",
    "Embalagem (R$)",
    "Acessórios (R$)",
    "Custo Total Lote (R$)",
    "Custo Unitário (R$)",
    "Preço Direto 50% (R$)",
    "Preço Direto 100% (R$)"
  ];
  if (marketplace) {
    summaryHeader.push(`Preço ${mpName} 50% (R$)`, `Preço ${mpName} 100% (R$)`);
  }
  const summaryRows: any[] = [summaryHeader];

  for (const prod of products) {
    const r = pricingById.get(prod.id)!;
    const m50 = findMarginRow(r, 0.5, settings, prod.quantityInBatch);
    const m100 = findMarginRow(r, 1.0, settings, prod.quantityInBatch);

    const row: any[] = [
      prod.name,
      prod.category || "Geral",
      prod.quantityInBatch,
      r.totalGrams,
      r.totalTimeString,
      r.filamentCost,
      r.energyCost,
      r.machineCost,
      r.laborCost,
      r.packagingCost,
      r.accessoriesCost,
      r.totalCost,
      r.unitCost,
      m50?.directSalePrice ?? 0,
      m100?.directSalePrice ?? 0
    ];
    if (marketplace) {
      row.push(
        m50?.marketplacePrices[marketplace.id]?.salePrice ?? 0,
        m100?.marketplacePrices[marketplace.id]?.salePrice ?? 0
      );
    }
    summaryRows.push(row);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "CATÁLOGO GERAL");

  // 2. Abas individuais por produto (compatível com a planilha original)
  const usedSheetNames = new Set<string>(["CATÁLOGO GERAL"]);
  for (const prod of products) {
    const r = pricingById.get(prod.id)!;
    const safeSheetName = uniqueSheetName(prod.name, usedSheetNames);

    const sheetData: any[] = [
      [prod.name.toUpperCase()],
      ["Filamento:", `R$ ${settings.defaultFilamentPricePerKg.toFixed(2).replace(".", ",")}/kg`],
      ["Energia:", `R$ ${settings.energyKwhPrice.toFixed(2).replace(".", ",")}/kWh`],
      ["Potência média da impressora:", `${settings.defaultPrinterWatts} W (${(settings.defaultPrinterWatts / 1000).toFixed(3).replace(".", ",")} kW)`],
      ["Quantidade produto impressa:", prod.quantityInBatch],
      [],
      ["Produto", "Filamento", "Custo Filamento", "Tempo", "Custo Energia"]
    ];

    for (const p of prod.parts) {
      // Custo da parte com o mesmo cálculo do sistema (respeita filamento e impressora de cada parte)
      const partPricing = calculatePricing(
        { ...prod, parts: [p], packagingCost: 0, packagingId: null, isCustomPackagingCost: true, accessoriesCost: 0, laborHours: 0 },
        settings,
        filaments,
        printers
      );
      const energyCost = partPricing.energyCost;
      const filCost = partPricing.filamentCost;
      sheetData.push([
        p.name,
        `${p.filamentGrams} g`,
        filCost,
        p.printTimeString,
        energyCost
      ]);
    }

    sheetData.push(["TOTAL", `${r.totalGrams} g`, r.filamentCost, r.totalTimeString, r.energyCost]);
    sheetData.push([]);
    sheetData.push(["Item", "Valor"]);
    sheetData.push(["Custo Filamento", r.filamentCost]);
    sheetData.push(["Custo Energia", r.energyCost]);
    if (r.machineCost > 0) sheetData.push(["Máquina (depreciação)", r.machineCost]);
    if (r.laborCost > 0) sheetData.push(["Mão de Obra", r.laborCost]);
    sheetData.push(["Embalagem", r.packagingCost]);
    sheetData.push(["Acessórios", r.accessoriesCost]);
    const varLabel = r.isCustomVariableCost
      ? `Custo Variável (${r.variableCostPercent}% - Personalizado)`
      : `Custo Variável (${r.variableCostPercent}% - Padrão)`;
    sheetData.push([varLabel, r.variableCost]);
    sheetData.push(["CUSTO DO PRODUTO", r.totalCost]);
    if (prod.quantityInBatch > 1) {
      sheetData.push(["CUSTO UNITÁRIO", r.unitCost]);
    }
    sheetData.push([]);
    sheetData.push(["Markup / Margem", "Valor de Venda", "Lucro (R$)"]);

    for (const m of r.margins) {
      sheetData.push([m.marginLabel, m.directSalePrice, m.directProfit]);
    }

    if (marketplace) {
      sheetData.push([]);
      sheetData.push([`VENDA ${mpName.toUpperCase()}`]);
      sheetData.push([`Taxas: ${describeMarketplaceFees(marketplace)}`]);
      sheetData.push(["Markup / Margem", "Valor de Venda", "Lucro Líquido (R$)"]);

      for (const m of r.margins) {
        const mp = m.marketplacePrices[marketplace.id];
        if (mp) {
          sheetData.push([m.marginLabel, mp.salePrice, mp.netProfit]);
        }
      }
    }

    const wsProd = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, wsProd, safeSheetName);
  }

  // Download do arquivo no navegador
  const fileName = `precificacao-3d-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
