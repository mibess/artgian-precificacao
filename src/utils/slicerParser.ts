import JSZip from "jszip";
import { parseTimeToHours, formatHoursToTimeString } from "./timeParser";

export interface SlicerPartBreakdown {
  name: string;
  filamentGrams: number;
  material?: string;
}

export interface SlicerParseResult {
  detected: boolean;
  slicerType?: "Bambu/Orca" | "MakerWorld / Bambu" | "Cura" | "Prusa/SuperSlicer" | "Texto/Manual" | "Desconhecido";
  filamentGrams: number;
  timeHours: number;
  timeString: string;
  partsBreakdown?: SlicerPartBreakdown[];
  modelTitle?: string;
  profileTitle?: string;
  designer?: string;
  isMakerWorldProject?: boolean;
  rawMatchedText?: string;
  needsManualTimeOrWeight?: boolean;
}

/**
 * Densidades padrão de materiais comuns em g/cm³
 */
export const MATERIAL_DENSITIES: Record<string, number> = {
  PLA: 1.24,
  PETG: 1.27,
  ABS: 1.04,
  ASA: 1.07,
  TPU: 1.21,
  SILK: 1.24,
  NYLON: 1.14,
  PC: 1.20,
  HIPS: 1.04,
  PVA: 1.23
};

const DEFAULT_DENSITY = 1.24;

/**
 * Converte comprimento em metros de filamento 1.75mm para gramas com base na densidade do material.
 * Volume de cilindro: V = pi * r^2 * L (com r = 0.0875 cm e L em cm = metros * 100)
 */
export function convertMetersToGrams(meters: number, material = "PLA"): number {
  if (meters <= 0 || isNaN(meters)) return 0;
  const matKey = (material || "").toUpperCase().trim();
  const density = MATERIAL_DENSITIES[matKey] || DEFAULT_DENSITY;
  const radiusCm = 0.175 / 2; // 0.0875 cm para filamento de 1.75mm
  const lengthCm = meters * 100;
  const volumeCm3 = Math.PI * Math.pow(radiusCm, 2) * lengthCm;
  return Math.round(volumeCm3 * density * 100) / 100;
}

/**
 * Limpa nomes de arquivos removendo símbolos como "+", "_", traços e extensões
 */
export function cleanFileNameToTitle(fileName: string): string {
  return fileName
    .replace(/\.(gcode|3mf|txt|stl)$/i, "")
    .replace(/[+_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Analisa texto colado pelo usuário (da tela do MakerWorld, Bambu Handy, ou cabeçalho de fatiador)
 */
export function parseSlicerText(text: string): SlicerParseResult {
  if (!text || !text.trim()) {
    return { detected: false, filamentGrams: 0, timeHours: 0, timeString: "0min" };
  }

  // Detectar marcas e fatiadores por comentários de cabeçalho
  const hasPrusaHeader = /;\s*generated\s+by\s+(?:PrusaSlicer|SuperSlicer)/i.test(text);
  const hasBambuOrcaHeader = /;\s*(?:generated\s+by\s+)?(?:BambuStudio|OrcaSlicer)/i.test(text);
  const hasCuraHeader = /;\s*Generated\s+with\s+Cura/i.test(text);

  let slicerType: SlicerParseResult["slicerType"] = "Texto/Manual";
  let grams = 0;
  let timeHours = 0;
  let timeString = "";
  const partsBreakdown: SlicerPartBreakdown[] = [];

  // 1. Bambu Studio / OrcaSlicer / PrusaSlicer G-code explícito
  const standardGrams = text.match(/;\s*(?:total\s+)?filament\s+used\s*\[g\]\s*=\s*([0-9.,\s]+)/i);
  const standardTime = text.match(/;\s*estimated\s+printing\s+time(?:\s*\([a-z\s]+\))?\s*=\s*([^\r\n;]+)/i);

  if (standardGrams || standardTime) {
    if (hasPrusaHeader) {
      slicerType = "Prusa/SuperSlicer";
    } else {
      slicerType = "Bambu/Orca";
    }

    if (standardGrams) {
      const vals = standardGrams[1].split(",").map(v => parseFloat(v.trim().replace(",", ".")) || 0);
      grams = vals.reduce((a, b) => a + b, 0);
      if (vals.length > 1) {
        vals.forEach((v, idx) => {
          partsBreakdown.push({ name: `Cor / Filamento ${idx + 1}`, filamentGrams: v });
        });
      }
    }
    if (standardTime) {
      const parsed = parseTimeToHours(standardTime[1].trim());
      timeHours = parsed.hours;
      timeString = parsed.formatted;
    }
    return {
      detected: true,
      slicerType,
      filamentGrams: Math.round(grams * 100) / 100,
      timeHours,
      timeString: timeString || parseTimeToHours(timeHours).formatted,
      partsBreakdown: partsBreakdown.length > 0 ? partsBreakdown : undefined,
      rawMatchedText: (standardGrams ? standardGrams[0] : "") + " | " + (standardTime ? standardTime[0] : "")
    };
  }

  // 2. Cura G-code (;TIME:7200 e ;Filament used: 2.5m ou ;Filament used: 15.2g)
  const curaTime = text.match(/;TIME:(\d+)/i);
  const curaFilament = text.match(/;Filament\s+used:\s*([^\r\n]+)/i);

  if (curaTime || curaFilament || hasCuraHeader) {
    slicerType = "Cura";
    let detectedCura = false;

    if (curaTime) {
      detectedCura = true;
      const seconds = parseInt(curaTime[1], 10);
      timeHours = seconds / 3600;
      timeString = formatHoursToTimeString(timeHours);
    }

    if (curaFilament) {
      detectedCura = true;
      const filStr = curaFilament[1].trim();

      // Verificar se possui gramas direto (ex: "15.2g")
      const gramMatches = Array.from(filStr.matchAll(/([0-9]+(?:[.,][0-9]+)?)\s*g\b/gi));
      if (gramMatches.length > 0) {
        grams = gramMatches.reduce((acc, m) => acc + (parseFloat(m[1].replace(",", ".")) || 0), 0);
      } else {
        // Verificar se possui metros (ex: "2.5m" ou "2.5m, 1.2m")
        const meterMatches = Array.from(filStr.matchAll(/([0-9]+(?:[.,][0-9]+)?)\s*m\b/gi));
        if (meterMatches.length > 0) {
          // Tentar detectar material dos cabeçalhos do Cura (;MATERIAL:PLA ou ;Material: PETG)
          const matMatch = text.match(/;(?:MATERIAL(?:_NAME_\d+)?|Material):\s*([A-Za-z0-9_-]+)/i);
          const matName = matMatch ? matMatch[1].trim() : "PLA";
          let totalG = 0;
          meterMatches.forEach(mm => {
            const mVal = parseFloat(mm[1].replace(",", ".")) || 0;
            totalG += convertMetersToGrams(mVal, matName);
          });
          grams = totalG;
        }
      }
    }

    if (detectedCura) {
      return {
        detected: true,
        slicerType,
        filamentGrams: Math.round(grams * 100) / 100,
        timeHours,
        timeString: timeString || (timeHours > 0 ? formatHoursToTimeString(timeHours) : "0min"),
        needsManualTimeOrWeight: grams === 0 || timeHours === 0,
        rawMatchedText: (curaFilament ? curaFilament[0] : "") + " | " + (curaTime ? curaTime[0] : "")
      };
    }
  }

  // 3. MakerWorld / Bambu Handy Screen Text (ex: "1 plate 1.4 h 0.4 mm 17 g AMS PLA | 14 g PLA | 3 g")
  const amsRegex = /(?:([A-Za-z0-9\s]+?)\s*\|\s*)?([0-9]+(?:[.,][0-9]+)?)\s*g\b/gi;
  const amsMatches = Array.from(text.matchAll(amsRegex));
  if (amsMatches.length > 1) {
    const subParts: SlicerPartBreakdown[] = [];

    for (const match of amsMatches) {
      const rawMat = (match[1] || "").trim();
      const val = parseFloat(match[2].replace(",", ".")) || 0;
      if (val > 0) {
        const matMatch = rawMat.match(/\b(PLA|PETG|ABS|TPU|SILK|NYLON|PVA|PC|ASA)\b/i);
        const materialName = matMatch ? matMatch[1].toUpperCase() : undefined;
        subParts.push({
          name: materialName ? `${materialName} (${val}g)` : `Parte ${subParts.length + 1} (${val}g)`,
          filamentGrams: val,
          material: materialName
        });
      }
    }

    if (subParts.length >= 3) {
      const first = subParts[0].filamentGrams;
      const restSum = subParts.slice(1).reduce((acc, p) => acc + p.filamentGrams, 0);
      if (Math.abs(first - restSum) < 0.5) {
        grams = first;
        partsBreakdown.push(...subParts.slice(1));
      } else {
        grams = subParts.reduce((acc, p) => acc + p.filamentGrams, 0);
        partsBreakdown.push(...subParts);
      }
    } else {
      grams = subParts.reduce((acc, p) => acc + p.filamentGrams, 0);
      partsBreakdown.push(...subParts);
    }
  }

  // Se não extraiu gramas pelo AMS, tenta achar o peso direto (ex: "17 g", "76g", "76.5 g")
  if (grams === 0) {
    const gramMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:g\b|gramas?\b|gr\b)/i);
    const kgMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:kg\b|quilos?\b)/i);
    if (gramMatch) {
      grams = parseFloat(gramMatch[1].replace(",", ".")) || 0;
    } else if (kgMatch) {
      grams = (parseFloat(kgMatch[1].replace(",", ".")) || 0) * 1000;
    }
  }

  // Detecção de tempo inteligente:
  // Primeiro verifica se há formato com dias (ex: "1d 2h 30m" ou "1 dia")
  const dayMatches = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:d\b|dias?\b)/i);
  if (dayMatches) {
    const fullTimeMatch = text.match(/([0-9]+(?:[.,][0-9]+)?\s*(?:d|dias?))(?:\s*[0-9]+(?:[.,][0-9]+)?\s*(?:h|horas?|hrs?))?(?:\s*[0-9]+(?:[.,][0-9]+)?\s*(?:m|min|minutos?))?/i);
    if (fullTimeMatch) {
      const parsed = parseTimeToHours(fullTimeMatch[0]);
      if (parsed.valid) {
        timeHours = parsed.hours;
        timeString = parsed.formatted;
      }
    }
  }

  // Se não achou por dias, procura por horas (suporta "1.4 h", "1.4h", "5h40min", "2h37min")
  if (timeHours === 0) {
    const timeMatches = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:h\b|hr\b|hrs\b|horas?\b)/i);
    if (timeMatches) {
      const parsed = parseTimeToHours(timeMatches[0]);
      if (parsed.valid) {
        timeHours = parsed.hours;
        timeString = parsed.formatted;
      }
    }
  }

  // Se não achou horas, procura por minutos ("45 min", "25min")
  if (timeHours === 0) {
    const minMatches = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:minutos?\b|mins?\b|m\b)(?!ini)/i);
    if (minMatches) {
      const parsed = parseTimeToHours(minMatches[0]);
      if (parsed.valid) {
        timeHours = parsed.hours;
        timeString = parsed.formatted;
      }
    }
  }

  // Formato de relógio "1:24" ou "5:40:00"
  if (timeHours === 0) {
    const clockMatch = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
    if (clockMatch) {
      const parsed = parseTimeToHours(clockMatch[1]);
      if (parsed.valid) {
        timeHours = parsed.hours;
        timeString = parsed.formatted;
      }
    }
  }

  const detected = grams > 0 || timeHours > 0;
  if (text.toLowerCase().includes("bambu") || text.toLowerCase().includes("makerworld") || text.toLowerCase().includes("ams")) {
    slicerType = "MakerWorld / Bambu";
  }

  return {
    detected,
    slicerType: detected ? slicerType : "Desconhecido",
    filamentGrams: Math.round(grams * 100) / 100,
    timeHours,
    timeString: timeString || (timeHours > 0 ? parseTimeToHours(timeHours).formatted : "0min"),
    partsBreakdown: partsBreakdown.length > 0 ? partsBreakdown : undefined,
    rawMatchedText: text.slice(0, 150)
  };
}

/**
 * Lê arquivo enviado pelo usuário (.gcode ou .3mf do Bambu/Prusa/MakerWorld)
 */
export async function parseSlicerFile(file: File): Promise<SlicerParseResult> {
  const fileName = file.name.toLowerCase();

  // 1. Arquivo G-code puro ou texto de log
  if (fileName.endsWith(".gcode") || fileName.endsWith(".txt") || fileName.endsWith(".log")) {
    let text = "";
    if (typeof file.slice === "function" && typeof file.size === "number" && file.size > 0) {
      const headBlob = file.slice(0, 150000);
      const headText = await headBlob.text();
      let tailText = "";
      if (file.size > 150000) {
        const tailStart = Math.max(150000, file.size - 80000);
        const tailBlob = file.slice(tailStart, file.size);
        tailText = await tailBlob.text();
      }
      text = headText + "\n" + tailText;
    } else {
      text = await file.text();
    }
    return parseSlicerText(text);
  }

  // 2. Arquivo .3mf (pacote ZIP)
  if (fileName.endsWith(".3mf")) {
    try {
      const zip = await JSZip.loadAsync(file);

      // A) Extrair metadados do modelo de 3D/3dmodel.model
      let modelTitle = "";
      let profileTitle = "";
      let designer = "";

      const modelFile = zip.file(/3D\/3dmodel\.model$/i)[0];
      if (modelFile) {
        const modelXml = await modelFile.async("text");
        const titleMatch = modelXml.match(/<metadata name="Title">([^<]+)<\/metadata>/i);
        const profileMatch = modelXml.match(/<metadata name="ProfileTitle">([^<]+)<\/metadata>/i);
        const designerMatch = modelXml.match(/<metadata name="Designer">([^<]+)<\/metadata>/i);

        if (titleMatch) modelTitle = titleMatch[1].trim();
        if (profileMatch) profileTitle = profileMatch[1].trim();
        if (designerMatch) designer = designerMatch[1].trim();
      }

      // Se não achou título dentro do XML, usa o nome do arquivo limpo
      if (!modelTitle) {
        modelTitle = cleanFileNameToTitle(file.name);
      }

      // B) Verificar G-codes fatiados dentro do 3MF (Metadata/plate_*.gcode com suporte multi-plate)
      let plateFiles = zip.file(/Metadata\/plate_\d+\.gcode$/i);
      if (plateFiles.length === 0) {
        const fallback = zip.file(/Metadata\/.*\.gcode$/i)[0] || zip.file(/\.gcode$/i)[0];
        if (fallback) plateFiles = [fallback];
      }

      if (plateFiles.length > 0) {
        plateFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        let totalPlateGrams = 0;
        let totalPlateHours = 0;
        const combinedParts: SlicerPartBreakdown[] = [];
        let detectedAnyPlate = false;

        for (let i = 0; i < plateFiles.length; i++) {
          const pf = plateFiles[i];
          const plateText = await pf.async("text");
          const slice = plateText.slice(0, 150000) + "\n" + plateText.slice(-80000);
          const parsedPlate = parseSlicerText(slice);

          if (parsedPlate.detected) {
            detectedAnyPlate = true;
            totalPlateGrams += parsedPlate.filamentGrams;
            totalPlateHours += parsedPlate.timeHours;

            if (plateFiles.length > 1) {
              if (parsedPlate.partsBreakdown && parsedPlate.partsBreakdown.length > 1) {
                parsedPlate.partsBreakdown.forEach(pb => {
                  combinedParts.push({
                    name: `Placa ${i + 1} - ${pb.name}`,
                    filamentGrams: pb.filamentGrams,
                    material: pb.material
                  });
                });
              } else {
                combinedParts.push({
                  name: `Placa ${i + 1}`,
                  filamentGrams: parsedPlate.filamentGrams
                });
              }
            } else if (parsedPlate.partsBreakdown) {
              combinedParts.push(...parsedPlate.partsBreakdown);
            }
          }
        }

        if (detectedAnyPlate) {
          return {
            detected: true,
            slicerType: "Bambu/Orca",
            filamentGrams: Math.round(totalPlateGrams * 100) / 100,
            timeHours: totalPlateHours,
            timeString: formatHoursToTimeString(totalPlateHours),
            partsBreakdown: combinedParts.length > 0 ? combinedParts : undefined,
            modelTitle,
            profileTitle,
            designer
          };
        }
      }

      // C) Verificar Metadata/slice_info.config (Bambu Studio / OrcaSlicer XML real e legado)
      const sliceInfoFile = zip.file(/Metadata\/slice_info\.config/i)[0];
      if (sliceInfoFile) {
        const xml = await sliceInfoFile.async("text");
        let totalGrams = 0;
        let totalSeconds = 0;
        const filamentMap = new Map<string, { name: string; grams: number; material?: string }>();

        // 1. Extração por atributos modernos do Bambu Studio (<metadata key="weight" value="..."/>)
        const attrWeightMatches = Array.from(xml.matchAll(/<metadata\s+key="weight"\s+value="([0-9.]+)"\s*\/>/gi));
        for (const m of attrWeightMatches) {
          totalGrams += parseFloat(m[1]) || 0;
        }

        const attrPredMatches = Array.from(xml.matchAll(/<metadata\s+key="prediction"\s+value="([0-9.]+)"\s*\/>/gi));
        for (const m of attrPredMatches) {
          totalSeconds += parseFloat(m[1]) || 0;
        }

        // 2. Extração por tags legadas (<weight>...</weight> e <prediction>...</prediction>)
        if (attrWeightMatches.length === 0) {
          const legacyWeightMatches = Array.from(xml.matchAll(/<weight>([0-9.]+)<\/weight>/gi));
          for (const m of legacyWeightMatches) {
            totalGrams += parseFloat(m[1]) || 0;
          }
        }
        if (attrPredMatches.length === 0) {
          const legacyPredMatches = Array.from(xml.matchAll(/<prediction>([0-9.]+)<\/prediction>/gi));
          for (const m of legacyPredMatches) {
            totalSeconds += parseFloat(m[1]) || 0;
          }
        }

        // 3. Extrair filamentos individuais (<filament id="1" type="PLA" color="#FFFFFF" used_g="14.20"/>)
        const filamentMatches = Array.from(xml.matchAll(/<filament\s+([^>]+)\/>/gi));
        for (const fm of filamentMatches) {
          const attrs = fm[1];
          const idMatch = attrs.match(/id="([^"]+)"/i);
          const typeMatch = attrs.match(/type="([^"]+)"/i);
          const colorMatch = attrs.match(/color="([^"]+)"/i);
          const usedGMatch = attrs.match(/used_g="([0-9.]+)"/i);

          if (usedGMatch) {
            const gVal = parseFloat(usedGMatch[1]) || 0;
            if (gVal > 0) {
              const id = idMatch ? idMatch[1] : "1";
              const type = typeMatch ? typeMatch[1].toUpperCase() : "FILAMENTO";
              const color = colorMatch ? colorMatch[1] : "";
              const key = `${id}-${type}-${color}`;
              const label = color ? `${type} ${color}` : type;

              const existing = filamentMap.get(key);
              if (existing) {
                existing.grams += gVal;
              } else {
                filamentMap.set(key, { name: label, grams: gVal, material: type });
              }
            }
          }
        }

        if (totalGrams === 0 && filamentMap.size > 0) {
          totalGrams = Array.from(filamentMap.values()).reduce((sum, f) => sum + f.grams, 0);
        }

        if (totalGrams > 0 || totalSeconds > 0) {
          const timeHours = totalSeconds / 3600;
          const partsBreakdown: SlicerPartBreakdown[] = Array.from(filamentMap.values()).map(f => ({
            name: `${f.name} (${Math.round(f.grams * 10) / 10}g)`,
            filamentGrams: Math.round(f.grams * 100) / 100,
            material: f.material
          }));

          return {
            detected: true,
            slicerType: "Bambu/Orca",
            filamentGrams: Math.round(totalGrams * 100) / 100,
            timeHours,
            timeString: formatHoursToTimeString(timeHours),
            partsBreakdown: partsBreakdown.length > 1 ? partsBreakdown : undefined,
            modelTitle,
            profileTitle,
            designer
          };
        }
      }

      // D) Caso seja um projeto do MakerWorld antes do fatiamento local
      return {
        detected: true,
        isMakerWorldProject: true,
        slicerType: "MakerWorld / Bambu",
        modelTitle: profileTitle ? `${modelTitle} (${profileTitle})` : modelTitle,
        profileTitle,
        designer,
        filamentGrams: 0,
        timeHours: 0,
        timeString: "",
        needsManualTimeOrWeight: true
      };

    } catch (err) {
      console.warn("Erro ao ler 3MF como ZIP:", err);
    }
  }

  return {
    detected: false,
    filamentGrams: 0,
    timeHours: 0,
    timeString: "0min"
  };
}
