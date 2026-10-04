import { describe, it, expect } from "vitest";
import { defaultProducts, defaultSettings, defaultFilaments, defaultPrinters, defaultPackagings, defaultCustomPackagingAddons } from "../src/data/defaultData";
import { 
  calculatePricing, 
  AVAILABLE_MARGIN_OPTIONS, 
  simulateCustomSalePrice,
  formatBRL,
  roundMoney,
  calculateMarketplaceFee
} from "../src/utils/calculator";
import { ProductItem, GlobalSettings, MarketplaceConfig } from "../src/types/pricing";

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

  it("simulateCustomSalePrice deve calcular markup sobre custo e margem sobre venda corretamente", () => {
    // Custo R$ 50, Venda R$ 100 -> Lucro R$ 50
    // Markup = 50/50 = 100%
    // Margem = 50/100 = 50%
    const simDirect = simulateCustomSalePrice(100, 50);
    expect(simDirect.netProfit).toBe(50);
    expect(simDirect.markupPercent).toBe(100);
    expect(simDirect.marginPercent).toBe(50);

    const shopee = defaultSettings.marketplaces.find(m => m.id === "shopee")!;
    const simShopee = simulateCustomSalePrice(100, 50, shopee);
    // Taxa Shopee: 100 * 0.20 + 4 = 24
    // Líquido: 100 - 24 = 76
    // Lucro: 76 - 50 = 26
    // Markup = 26 / 50 = 52%
    // Margem = 26 / 100 = 26%
    expect(simShopee.fee).toBe(24);
    expect(simShopee.netProfit).toBe(26);
    expect(simShopee.markupPercent).toBeCloseTo(52);
    expect(simShopee.marginPercent).toBeCloseTo(26);
  });

  it("deve recalcular custo dinamicamente quando a embalagem vinculada é alterada", () => {
    const prod: ProductItem = {
      ...defaultProducts[0],
      isCustomPackagingCost: false,
      packagingId: defaultPackagings[0].id,
      packagingCost: 0 // não deve usar o snapshot quando tem vínculo
    };

    // Caixa 1 custa 1.45 + 0.70 + 0.18 + 0.11 + 0.50 = 2.94
    const pricing = calculatePricing(prod, defaultSettings, defaultFilaments, defaultPrinters, defaultPackagings, defaultCustomPackagingAddons);
    expect(pricing.packagingCost).toBeCloseTo(2.94, 2);

    // Se o preço da caixa mudar para R$ 10,00
    const modifiedPackagings = defaultPackagings.map(pkg => 
      pkg.id === defaultPackagings[0].id ? { ...pkg, boxPrice: 10.00 } : pkg
    );
    const pricingNew = calculatePricing(prod, defaultSettings, defaultFilaments, defaultPrinters, modifiedPackagings, defaultCustomPackagingAddons);
    expect(pricingNew.packagingCost).toBeCloseTo(11.49, 2);
  });

  it("deve suportar embalagem por unidade (packagingMode: perUnit) em lotes", () => {
    const prod: ProductItem = {
      ...defaultProducts[1], // 16 unidades
      packagingCost: 2.00,
      packagingMode: "perUnit"
    };

    const pricing = calculatePricing(prod, defaultSettings, defaultFilaments, defaultPrinters);
    // 16 unidades * R$ 2,00 por unidade = R$ 32,00 de embalagem no lote
    expect(pricing.packagingCost).toBe(32.00);
  });

  it("deve suportar custos opcionais de depreciação de máquina e mão de obra", () => {
    const customSettings: GlobalSettings = {
      ...defaultSettings,
      machineCostPerHour: 2.00, // R$ 2/h de máquina
      laborCostPerHour: 30.00 // R$ 30/h de mão de obra
    };

    const prod: ProductItem = {
      ...defaultProducts[0], // Rena: 5h40min de impressão = 5.6667h
      laborHours: 0.5 // 30 min de pós-processamento
    };

    const pricing = calculatePricing(prod, customSettings, defaultFilaments, defaultPrinters);
    expect(pricing.machineCost).toBeCloseTo(5.6667 * 2.00, 2); // ~11.33
    expect(pricing.laborCost).toBeCloseTo(15.00, 2); // 0.5 * 30 = 15
  });

  it("calculateMarketplaceFee deve respeitar teto de comissão (commissionCap)", () => {
    const mp: MarketplaceConfig = {
      id: "teste_teto",
      name: "Canal com Teto",
      commissionPercent: 20,
      fixedFee: 5,
      commissionCap: 50, // max 50 reais de comissão
      enabled: true,
      colorBadge: ""
    };

    // Preço 100: comissão 20 (abaixo do teto 50) + taxa 5 = 25
    expect(calculateMarketplaceFee(100, mp)).toBe(25);
    // Preço 500: comissão seria 100, mas teto é 50 -> 50 + 5 = 55
    expect(calculateMarketplaceFee(500, mp)).toBe(55);
  });

  it("formatBRL e roundMoney devem formatar valores com precisão", () => {
    expect(roundMoney(12.3456)).toBe(12.35);
    expect(roundMoney(10)).toBe(10);
    const brl = formatBRL(12.5);
    expect(brl).toContain("12,50");
  });
});
