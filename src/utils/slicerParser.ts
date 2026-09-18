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

  let slicerType: SlicerParseResult["slicerType"] = "Texto/Manual";
  let grams = 0;
  let timeHours = 0;
  let timeString = "";
  const partsBreakdown: SlicerPartBreakdown[] = [];

  // 1. Bambu Studio / OrcaSlicer G-code explícito
  const bambuGrams = text.match(/;\s*(?:total\s+)?filament\s+used\s*\[g\]\s*=\s*([0-9.,\s]+)/i);
  const bambuTime = text.match(/;\s*estimated\s+printing\s+time(?:\s*\([a-z\s]+\))?\s*=\s*([^\r\n;]+)/i);

  if (bambuGrams || bambuTime) {
    slicerType = "Bambu/Orca";
    if (bambuGrams) {
      const vals = bambuGrams[1].split(",").map(v => parseFloat(v.trim().replace(",", ".")) || 0);
      grams = vals.reduce((a, b) => a + b, 0);
      if (vals.length > 1) {
        vals.forEach((v, idx) => {
          partsBreakdown.push({ name: `Cor / Filamento ${idx + 1}`, filamentGrams: v });
        });
      }
    }
    if (bambuTime) {
      const parsed = parseTimeToHours(bambuTime[1].trim());
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
      rawMatchedText: (bambuGrams ? bambuGrams[0] : "") + " | " + (bambuTime ? bambuTime[0] : "")
    };
  }

  // 2. Cura G-code
  const curaTime = text.match(/;TIME:(\d+)/i);
  const curaGrams = text.match(/;Filament\s+used:[^\n]*?([0-9.]+)\s*g/i);

  if (curaTime || curaGrams) {
    slicerType = "Cura";
    if (curaTime) {
      const seconds = parseInt(curaTime[1], 10);
      timeHours = seconds / 3600;
      timeString = parseTimeToHours(timeHours).formatted;
    }
    if (curaGrams) {
      grams = parseFloat(curaGrams[1]) || 0;
    }
    return {
      detected: true,
      slicerType,
      filamentGrams: Math.round(grams * 100) / 100,
      timeHours,
      timeString,
      rawMatchedText: (curaGrams ? curaGrams[0] : "") + " | " + (curaTime ? curaTime[0] : "")
    };
  }

  // 3. MakerWorld / Bambu Handy Screen Text (ex: "1 plate 1.4 h 0.4 mm 17 g AMS PLA | 14 g PLA | 3 g")
  // Detecta quebras por cor / AMS: "PLA | 14 g", "PLA | 3 g" ou "14 g + 3 g"
  const amsRegex = /(?:([A-Za-z0-9\s]+?)\s*\|\s*)?([0-9]+(?:[.,][0-9]+)?)\s*g\b/gi;
  const amsMatches = Array.from(text.matchAll(amsRegex));
  if (amsMatches.length > 1) {
    const subParts: SlicerPartBreakdown[] = [];

    for (const match of amsMatches) {
      const rawMat = (match[1] || "").trim();
      const val = parseFloat(match[2].replace(",", ".")) || 0;
      if (val > 0) {
        // Tenta achar material padrão (PLA, PETG, ABS, etc.)
        const matMatch = rawMat.match(/\b(PLA|PETG|ABS|TPU|SILK|NYLON|PVA|PC|ASA)\b/i);
        const materialName = matMatch ? matMatch[1].toUpperCase() : undefined;
        subParts.push({
          name: materialName ? `${materialName} (${val}g)` : `Parte ${subParts.length + 1} (${val}g)`,
          filamentGrams: val,
          material: materialName
        });
      }
    }

    // Se o primeiro item é igual à soma dos outros (ex: 17g no total e depois 14g + 3g):
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

  // Detecção de tempo inteligente (suporta "1.4 h", "1.4h", "45 min", "5h40min", "2h37min", "01:24")
  // Cuidado para ignorar "A1 mini" com word boundary!
  const timeMatches = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:h\b|hr\b|hrs\b|horas?\b)/i);
  if (timeMatches) {
    const parsed = parseTimeToHours(timeMatches[0]);
    timeHours = parsed.hours;
    timeString = parsed.formatted;
  }

  // Se não achou horas, procura por minutos ("45 min", "25min")
  if (timeHours === 0) {
    const minMatches = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:minutos?\b|mins?\b|m\b)(?!ini)/i);
    if (minMatches) {
      const parsed = parseTimeToHours(minMatches[0]);
      timeHours = parsed.hours;
      timeString = parsed.formatted;
    }
  }

  // Tenta formato de relógio "1:24" ou "5:40"
  if (timeHours === 0) {
    const clockMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
    if (clockMatch) {
      const parsed = parseTimeToHours(clockMatch[0]);
      timeHours = parsed.hours;
      timeString = parsed.formatted;
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
    const text = await file.text();
    const slice = text.slice(0, 150000) + "\n" + text.slice(-80000);
    return parseSlicerText(slice);
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

      // B) Verificar se possui G-code fatiado dentro do 3MF (Metadata/plate_*.gcode ou qualquer .gcode)
      const gcodeInside = zip.file(/Metadata\/.*\.gcode$/i)[0] || zip.file(/\.gcode$/i)[0];
      if (gcodeInside) {
        const gcodeText = await gcodeInside.async("text");
        const slice = gcodeText.slice(0, 150000) + "\n" + gcodeText.slice(-80000);
        const parsed = parseSlicerText(slice);
        if (parsed.detected) {
          return {
            ...parsed,
            modelTitle,
            profileTitle,
            designer,
            slicerType: "Bambu/Orca"
          };
        }
      }

      // C) Verificar Metadata/slice_info.config (Bambu Studio / OrcaSlicer)
      const sliceInfoFile = zip.file(/Metadata\/slice_info\.config/i)[0];
      if (sliceInfoFile) {
        const xml = await sliceInfoFile.async("text");
        let totalGrams = 0;
        let totalSeconds = 0;

        const weightMatches = Array.from(xml.matchAll(new RegExp("<weight>([0-9.]+)</weight>", "gi")));
        for (const m of weightMatches) {
          totalGrams += parseFloat(m[1]) || 0;
        }

        const predMatches = Array.from(xml.matchAll(new RegExp("<prediction>([0-9.]+)</prediction>", "gi")));
        for (const m of predMatches) {
          totalSeconds += parseFloat(m[1]) || 0;
        }

        if (totalGrams > 0 || totalSeconds > 0) {
          const timeHours = totalSeconds / 3600;
          return {
            detected: true,
            slicerType: "Bambu/Orca",
            filamentGrams: Math.round(totalGrams * 100) / 100,
            timeHours,
            timeString: parseTimeToHours(timeHours).formatted,
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

  // ATENÇÃO: NUNCA rodar regex sobre bytes brutos binários de ZIP para evitar falsos positivos!
  return {
    detected: false,
    filamentGrams: 0,
    timeHours: 0,
    timeString: "0min"
  };
}
