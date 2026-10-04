import { describe, it, expect } from "vitest";
import { resolveUserCollections, remapProductReferences, scopeDefaultId } from "../src/utils/userDefaults";
import { defaultFilaments, defaultPrinters, defaultPackagings, defaultCustomPackagingAddons, defaultProducts } from "../src/data/defaultData";
import { ProductItem } from "../src/types/pricing";

const USER = "6f1c2a9e-1111-2222-3333-444455556666";

describe("userDefaults - insumos padrão por usuário", () => {
  it("mantém as coleções da nuvem quando existem", () => {
    const cloud = {
      filaments: [{ ...defaultFilaments[0], id: "fil-meu" }],
      printers: [{ ...defaultPrinters[0], id: "prn-meu" }],
      packagings: [{ ...defaultPackagings[0], id: "pkg-meu" }],
      customAddons: [{ ...defaultCustomPackagingAddons[0], id: "addon-meu" }]
    };
    const { collections, idMap } = resolveUserCollections(cloud, USER);
    expect(collections).toEqual(cloud);
    expect(idMap.size).toBe(0);
  });

  it("coleções vazias recebem os padrões com ids exclusivos do usuário", () => {
    const { collections, idMap } = resolveUserCollections(
      { filaments: [], printers: [], packagings: [], customAddons: [] },
      USER
    );
    expect(collections.filaments).toHaveLength(defaultFilaments.length);
    expect(collections.filaments[0].id).toBe(scopeDefaultId("fil-1", USER));
    expect(collections.filaments[0].id).toBe("fil-1-6f1c2a9e");
    expect(collections.printers.every(p => p.id.endsWith("-6f1c2a9e"))).toBe(true);
    expect(idMap.get("prn-a1")).toBe("prn-a1-6f1c2a9e");
    // ids determinísticos: a mesma conta sempre recebe os mesmos ids
    const again = resolveUserCollections({ filaments: [], printers: [], packagings: [], customAddons: [] }, USER);
    expect(again.collections.packagings.map(p => p.id)).toEqual(collections.packagings.map(p => p.id));
    // padrões originais não são alterados
    expect(defaultFilaments[0].id).toBe("fil-1");
  });

  it("religa referências de produtos que apontavam para ids padrão", () => {
    const { idMap } = resolveUserCollections({ filaments: [], printers: [], packagings: [], customAddons: [] }, USER);
    const product: ProductItem = {
      ...defaultProducts[0],
      packagingId: "pkg-caixa-20x15x10",
      parts: [{ ...defaultProducts[0].parts[0], filamentId: "fil-4", printerId: "prn-k1" }]
    };
    const [remapped] = remapProductReferences([product], idMap);
    expect(remapped.packagingId).toBe("pkg-caixa-20x15x10-6f1c2a9e");
    expect(remapped.parts[0].filamentId).toBe("fil-4-6f1c2a9e");
    expect(remapped.parts[0].printerId).toBe("prn-k1-6f1c2a9e");

    // sem mapa (coleções vindas da nuvem) os produtos ficam intactos
    const untouched = remapProductReferences([product], new Map());
    expect(untouched[0]).toBe(product);
  });
});
