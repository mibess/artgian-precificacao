import { describe, it, expect } from "vitest";
import { uniqueSheetName } from "../src/utils/excelIO";

describe("excelIO - nomes de abas", () => {
  it("gera nomes únicos para produtos com o mesmo nome", () => {
    const used = new Set<string>();
    expect(uniqueSheetName("Rena (Cópia)", used)).toBe("RENA (CÓPIA)");
    expect(uniqueSheetName("Rena (Cópia)", used)).toBe("RENA (CÓPIA) (2)");
    expect(uniqueSheetName("Rena (Cópia)", used)).toBe("RENA (CÓPIA) (3)");
  });

  it("respeita o limite de 31 caracteres e remove caracteres proibidos", () => {
    const used = new Set<string>();
    const longName = "Dragão Articulado Gigante: Edição/Especial [v2]";
    const first = uniqueSheetName(longName, used);
    const second = uniqueSheetName(longName, used);
    expect(first.length).toBeLessThanOrEqual(31);
    expect(second.length).toBeLessThanOrEqual(31);
    expect(first).not.toMatch(/[:\\/?*[\]]/);
    expect(second).not.toBe(first);
    expect(second.endsWith("(2)")).toBe(true);
  });

  it("usa um nome padrão quando o produto não tem nome", () => {
    expect(uniqueSheetName("", new Set())).toBe("PRODUTO");
  });
});
