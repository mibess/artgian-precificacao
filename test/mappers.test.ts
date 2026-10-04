import { describe, it, expect } from "vitest";
import {
  rowToProduct,
  productToRow,
  rowToSettings,
  settingsToRow,
  rowToPackaging,
  packagingToRow,
  safeNumber
} from "../src/services/mappers";
import { defaultSettings, defaultProducts, defaultPackagings } from "../src/data/defaultData";
import { GlobalSettings, ProductItem } from "../src/types/pricing";

describe("mappers do Supabase", () => {
  it("safeNumber respeita zero e usa fallback para vazios/inválidos", () => {
    expect(safeNumber(0, 10)).toBe(0);
    expect(safeNumber("2.5", 0)).toBe(2.5);
    expect(safeNumber(null, 7)).toBe(7);
    expect(safeNumber("", 7)).toBe(7);
    expect(safeNumber("abc", 7)).toBe(7);
    expect(safeNumber(Infinity, 7)).toBe(7);
  });

  it("configurações preservam custos de máquina, mão de obra e regra de perda", () => {
    const settings: GlobalSettings = {
      ...defaultSettings,
      machineCostPerHour: 2.5,
      laborCostPerHour: 30,
      variableCostAppliesToPackaging: false
    };
    const row = settingsToRow(settings, "settings-u1", "u1");
    expect(row.machine_cost_per_hour).toBe(2.5);
    expect(row.labor_cost_per_hour).toBe(30);
    expect(row.variable_cost_applies_to_packaging).toBe(false);
    expect(row.owner_id).toBe("u1");

    const back = rowToSettings(row);
    expect(back.machineCostPerHour).toBe(2.5);
    expect(back.laborCostPerHour).toBe(30);
    expect(back.variableCostAppliesToPackaging).toBe(false);
    expect(back.marketplaces).toEqual(settings.marketplaces);
  });

  it("configurações de banco sem as colunas novas usam os padrões do cálculo", () => {
    const legacyRow = {
      id: "default",
      energy_kwh_price: 1.1,
      default_filament_price_per_kg: 120,
      default_printer_watts: 95,
      default_variable_cost_percent: 12,
      marketplaces: null
    };
    const s = rowToSettings(legacyRow);
    expect(s.energyKwhPrice).toBe(1.1);
    expect(s.machineCostPerHour).toBe(0);
    expect(s.laborCostPerHour).toBe(0);
    expect(s.variableCostAppliesToPackaging).toBe(true);
    expect(s.marketplaces).toEqual(defaultSettings.marketplaces);
  });

  it("produto preserva horas de mão de obra e modo de embalagem", () => {
    const product: ProductItem = { ...defaultProducts[1], laborHours: 1.5, packagingMode: "perUnit" };
    const row = productToRow(product, "u1");
    expect(row.labor_hours).toBe(1.5);
    expect(row.packaging_mode).toBe("perUnit");

    const back = rowToProduct(row);
    expect(back.laborHours).toBe(1.5);
    expect(back.packagingMode).toBe("perUnit");
    expect(back.quantityInBatch).toBe(product.quantityInBatch);
    expect(back.parts).toHaveLength(product.parts.length);
  });

  it("produto legado (sem colunas novas) é lido com valores seguros", () => {
    const back = rowToProduct({
      id: "p1",
      name: "Legado",
      quantity_in_batch: 0,
      parts: [{ id: "a", name: "Parte", filamentGrams: "12.5", printTimeHours: null }],
      variable_cost_percent: null
    });
    expect(back.packagingMode).toBe("perBatch");
    expect(back.laborHours).toBe(0);
    expect(back.quantityInBatch).toBe(1);
    expect(back.variableCostPercent).toBeNull();
    expect(back.parts[0].filamentGrams).toBe(12.5);
    expect(back.parts[0].printTimeHours).toBe(0);
    expect(back.parts[0].printTimeString).toBe("0min");
  });

  it("embalagem faz round-trip sem perder itens", () => {
    const pkg = { ...defaultPackagings[0], customAddonIds: ["addon-1"], customItems: [{ id: "x", name: "Fita", price: 0.3 }] };
    const back = rowToPackaging(packagingToRow(pkg, "u1"));
    expect(back).toEqual(pkg);
  });
});
