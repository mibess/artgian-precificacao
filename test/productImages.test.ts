import { describe, it, expect } from "vitest";
import { fitWithin } from "../src/services/productImages";
import { rowToProduct, productToRow } from "../src/services/mappers";
import { defaultProducts } from "../src/data/defaultData";

describe("imagens de produto", () => {
  it("fitWithin reduz proporcionalmente e nunca amplia", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("mappers limitam a 3 imagens e descartam entradas inválidas", () => {
    const base = productToRow(defaultProducts[0]);
    const product = rowToProduct({
      ...base,
      images: [{ key: "a" }, { key: "" }, null, { key: "b" }, { key: "c" }, { key: "d" }]
    });
    expect(product.images).toEqual([{ key: "a" }, { key: "b" }, { key: "c" }]);
    expect(productToRow({ ...product, images: [...product.images!, { key: "e" }] }).images).toHaveLength(3);
  });

  it("linha sem a coluna images resulta em lista vazia", () => {
    expect(rowToProduct(productToRow(defaultProducts[0])).images).toEqual([]);
  });
});
