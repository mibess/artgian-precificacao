import { describe, it, expect } from "vitest";
import { defaultProducts, defaultSettings, defaultFilaments, defaultPrinters } from "../src/data/defaultData";
import { calculatePricing, AVAILABLE_MARGIN_OPTIONS, simulateCustomSalePrice } from "../src/utils/calculator";

describe("calculator - Calibração dos Produtos de Referência", () => {
  it("Rena Branca de Natal deve ter custo de R$ 13,23", () => {
    const rena = defaultProducts.find(p => p.id === "prod-rena-branca")!;
    const pricing = calculatePricing(rena, defaultSettings, defaultFilaments, defaultPrinters);
    expect(pricing.totalCost).toBeCloseTo(13.232, 2);
  });

  it("16 Chaveiros Labas deve ter custo do lote de R$ 27,11 e unitário R$ 1,69", () => {
    const chaveiros = defaultProducts.find(p => p.id === "prod-chaveiros-labas")!;
    const pricing = calculatePricing(chaveiros, defaultSettings, defaultFilaments, defaultPrinters);
    expect(pricing.totalCost).toBeCloseTo(27.11, 1);
    expect(pricing.unitCost).toBeCloseTo(1.69, 1);
  });

  it("Urso Natal Tricô deve ter custo de R$ 4,56", () => {
    const urso = defaultProducts.find(p => p.id === "prod-urso-natal")!;
    const pricing = calculatePricing(urso, defaultSettings, defaultFilaments, defaultPrinters);
    expect(pricing.totalCost).toBeCloseTo(4.56, 1);
  });

  it("AVAILABLE_MARGIN_OPTIONS devem ser consistentes com o cálculo de margens", () => {
    const rena = defaultProducts.find(p => p.id === "prod-rena-branca")!;
    const pricing = calculatePricing(rena, defaultSettings, defaultFilaments, defaultPrinters);

    for (const opt of AVAILABLE_MARGIN_OPTIONS) {
      const row = pricing.margins.find(m => Math.abs(m.marginPercent - opt.value) < 0.005);
      expect(row).toBeDefined();
      expect(row!.directProfit).toBeCloseTo(pricing.totalCost * opt.value, 2);
    }
  });

  it("simulateCustomSalePrice deve simular venda direta e com marketplace", () => {
    const simDirect = simulateCustomSalePrice(50, 20);
    expect(simDirect.netProfit).toBe(30);
    expect(simDirect.fee).toBe(0);

    const shopee = defaultSettings.marketplaces.find(m => m.id === "shopee")!;
    const simShopee = simulateCustomSalePrice(50, 20, shopee);
    expect(simShopee.fee).toBe(50 * 0.20 + 4); // 10 + 4 = 14
    expect(simShopee.netProfit).toBe(50 - 14 - 20); // 16
  });
});
