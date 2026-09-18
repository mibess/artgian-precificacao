import * as XLSX from "xlsx";
import { ProductItem, GlobalSettings, Filament, Printer } from "../types/pricing";
import { calculatePricing } from "./calculator";

/**
 * Exporta catálogo completo e abas individuais de cada produto em formato Excel (.xlsx)
 */
export function exportToExcel(
  products: ProductItem[],
  settings: GlobalSettings,
  filaments: Filament[],
  printers: Printer[]
) {
  const wb = XLSX.utils.book_new();

  // 1. Aba Resumo / Catálogo Consolidado
  const summaryRows: any[] = [
    [
      "Produto",
      "Categoria",
      "Qtd no Lote",
      "Peso (g)",
      "Tempo de Impressão",
      "Custo Filamento (R$)",
      "Custo Energia (R$)",
      "Embalagem (R$)",
      "Acessórios (R$)",
      "Custo Total Lote (R$)",
      "Custo Unitário (R$)",
      "Preço Direto 50% (R$)",
      "Preço Direto 100% (R$)",
      "Preço Shopee 50% (R$)",
      "Preço Shopee 100% (R$)"
    ]
  ];

  for (const prod of products) {
    const r = calculatePricing(prod, settings, filaments, printers);
    const m50 = r.margins.find(m => m.marginPercent === 0.5);
    const m100 = r.margins.find(m => m.marginPercent === 1.0);
    const shopee50 = m50?.marketplacePrices["shopee"]?.salePrice ?? 0;
    const shopee100 = m100?.marketplacePrices["shopee"]?.salePrice ?? 0;

    summaryRows.push([
      prod.name,
      prod.category || "Geral",
      prod.quantityInBatch,
      r.totalGrams,
      r.totalTimeString,
      r.filamentCost,
      r.energyCost,
      r.packagingCost,
      r.accessoriesCost,
      r.totalCost,
      r.unitCost,
      m50?.directSalePrice ?? 0,
      m100?.directSalePrice ?? 0,
      shopee50,
      shopee100
    ]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "CATÁLOGO GERAL");

  // 2. Abas individuais por produto (compatível com a planilha original)
  for (const prod of products) {
    const r = calculatePricing(prod, settings, filaments, printers);
    const safeSheetName = prod.name.slice(0, 30).replace(/[:\\/?*\[\]]/g, "-").toUpperCase();

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
      const kw = settings.defaultPrinterWatts / 1000;
      const energyCost = p.printTimeHours * kw * settings.energyKwhPrice;
      const filCost = (p.filamentGrams / 1000) * settings.defaultFilamentPricePerKg;
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
    sheetData.push(["Embalagem", r.packagingCost]);
    sheetData.push(["Acessórios", r.accessoriesCost]);
    sheetData.push(["Subtotal", r.subtotal]);
    sheetData.push([`Custo Variável (${r.variableCostPercent}%)`, r.variableCost]);
    sheetData.push(["CUSTO DO PRODUTO", r.totalCost]);
    if (prod.quantityInBatch > 1) {
      sheetData.push(["CUSTO UNITÁRIO", r.unitCost]);
    }
    sheetData.push([]);
    sheetData.push(["Margem de Lucro", "Valor de Venda", "Lucro (R$)"]);

    for (const m of r.margins) {
      sheetData.push([m.marginPercent, m.directSalePrice, m.directProfit]);
    }

    sheetData.push([]);
    sheetData.push(["VENDA DIRETA SHOPEE"]);
    sheetData.push(["Comissão 20% - Taxa Fixa R$ 4,00"]);
    sheetData.push(["Margem de Lucro", "Valor de Venda", "Lucro Líquido (R$)"]);

    for (const m of r.margins) {
      const shopee = m.marketplacePrices["shopee"];
      if (shopee) {
        sheetData.push([m.marginPercent, shopee.salePrice, shopee.netProfit]);
      }
    }

    const wsProd = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, wsProd, safeSheetName);
  }

  // Download do arquivo no navegador
  const fileName = `precificacao-3d-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
