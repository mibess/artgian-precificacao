import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseSlicerText, parseSlicerFile, cleanFileNameToTitle } from "../src/utils/slicerParser";

describe("slicerParser", () => {
  it("cleanFileNameToTitle deve higienizar nomes de arquivos", () => {
    expect(cleanFileNameToTitle("danger+dragon+multicolor.3mf")).toBe("Danger Dragon Multicolor");
    expect(cleanFileNameToTitle("meu_modelo_articulado.gcode")).toBe("Meu Modelo Articulado");
  });

  it("parseSlicerText deve extrair dados de texto do MakerWorld", () => {
    const makerWorldPrint = `
      multicolor
      jars_2003
      A1,A1 mini,X1,H2C,P1S,X1 Carbon
      1 plate  1.4 h  0.4 mm  17 g
      AMS  PLA | 14 g  PLA | 3 g
    `;
    const res = parseSlicerText(makerWorldPrint);
    expect(res.detected).toBe(true);
    expect(res.filamentGrams).toBe(17);
    expect(res.timeHours).toBeCloseTo(1.4);
    expect(res.partsBreakdown?.length).toBe(2);
    expect(res.partsBreakdown?.[0].filamentGrams).toBe(14);
    expect(res.partsBreakdown?.[1].filamentGrams).toBe(3);
  });

  it("parseSlicerText deve extrair dados de G-code Bambu/Orca", () => {
    const bambuGcode = `
      ; total filament used [g] = 76.5
      ; estimated printing time = 5h40min
    `;
    const res = parseSlicerText(bambuGcode);
    expect(res.detected).toBe(true);
    expect(res.slicerType).toBe("Bambu/Orca");
    expect(res.filamentGrams).toBe(76.5);
    expect(res.timeHours).toBeCloseTo(5 + 40 / 60);
  });

  it("parseSlicerFile deve ler metadados de arquivo 3MF sintético", async () => {
    const zip = new JSZip();
    zip.file("3D/3dmodel.model", `<?xml version="1.0" encoding="UTF-8"?>
      <model>
        <metadata name="Title">Dragão Articulado</metadata>
        <metadata name="Designer">ArtgianStudio</metadata>
      </model>
    `);
    zip.file("Metadata/plate_1.gcode", `
      ; total filament used [g] = 50.0
      ; estimated printing time = 3h30min
    `);
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const file = new File([zipBlob], "dragao.3mf", { type: "application/octet-stream" });

    const res = await parseSlicerFile(file);
    expect(res.detected).toBe(true);
    expect(res.modelTitle).toBe("Dragão Articulado");
    expect(res.designer).toBe("ArtgianStudio");
    expect(res.filamentGrams).toBe(50);
    expect(res.timeHours).toBeCloseTo(3.5);
  });
});
