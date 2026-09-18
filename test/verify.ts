import { defaultProducts, defaultSettings, defaultFilaments, defaultPrinters } from "../src/data/defaultData";
import { calculatePricing } from "../src/utils/calculator";
import { parseTimeToHours, formatHoursToTimeString } from "../src/utils/timeParser";
import { parseSlicerText, parseSlicerFile } from "../src/utils/slicerParser";
import fs from "fs";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error("FAIL:", msg);
    process.exit(1);
  } else {
    console.log("PASS:", msg);
  }
}

console.log("--- TESTES DE PARSER DE TEMPO (INCLUINDO HORAS DECIMAIS E BOUNDARIES) ---");
assert(Math.abs(parseTimeToHours("1.4 h").hours - 1.4) < 0.001, "1.4 h -> 1.4h (84 min)");
assert(Math.abs(parseTimeToHours("1.4h").hours - 1.4) < 0.001, "1.4h -> 1.4h");
assert(Math.abs(parseTimeToHours("2.3 h").hours - 2.3) < 0.001, "2.3 h -> 2.3h");
assert(Math.abs(parseTimeToHours("45 min").hours - 0.75) < 0.001, "45 min -> 0.75h");
assert(formatHoursToTimeString(1.4) === "1h24min", "Formatação de 1.4h -> 1h24min");

console.log("\n--- TESTES DE PARSER DE TEXTO DO MAKERWORLD / PRINT DO USUÁRIO ---");
const makerWorldPrint = `
  multicolor
  jars_2003
  A1,A1 mini,X1,H2C,P1S,X1 Carbon
  1 plate  1.4 h  0.4 mm  17 g
  AMS  PLA | 14 g  PLA | 3 g
`;
const parsedMW = parseSlicerText(makerWorldPrint);
assert(parsedMW.detected, "MakerWorld detectado");
assert(parsedMW.filamentGrams === 17, "Peso total do filamento = 17g");
assert(Math.abs(parsedMW.timeHours - 1.4) < 0.001, "Tempo de impressão = 1.4h (1h24min)");
assert(parsedMW.partsBreakdown?.length === 2, "Detectou as 2 cores AMS (14g e 3g)");
assert(parsedMW.partsBreakdown?.[0].filamentGrams === 14, "Cor 1 = 14g");
assert(parsedMW.partsBreakdown?.[1].filamentGrams === 3, "Cor 2 = 3g");

console.log("\n--- TESTES DE ARQUIVO 3MF REAL DO USUÁRIO (danger+dragon+multicolor.3mf) ---");
const buf = fs.readFileSync("/Users/mibess/Downloads/danger+dragon+multicolor.3mf");
const user3mf = new File([buf], "danger+dragon+multicolor.3mf");

async function runAsyncTests() {
  const fileRes = await parseSlicerFile(user3mf);
  assert(fileRes.detected, "Arquivo 3MF detectado com sucesso");
  assert(fileRes.modelTitle === "Articulated Dragon (multicolor)", "Título real extraído: Articulated Dragon (multicolor)");
  assert(fileRes.designer === "jars_2003", "Designer identificado: jars_2003");
  assert(fileRes.isMakerWorldProject === true, "Identificado como projeto MakerWorld");
  assert(fileRes.filamentGrams === 0, "NÃO caiu em falso positivo de 7g");

  console.log("\n--- TESTES DA PLANILHA ORIGINAL ---");
  const rena = defaultProducts.find(p => p.id === "prod-rena-branca")!;
  const rPricing = calculatePricing(rena, defaultSettings, defaultFilaments, defaultPrinters);
  assert(Math.abs(rPricing.totalCost - 13.23201) < 0.0001, "Rena: Custo = R$ 13,23201");

  console.log("\n--- TESTES DO SELETOR DE MARGEM (BUG FIX) ---");
  const { AVAILABLE_MARGIN_OPTIONS } = await import("../src/utils/calculator");
  
  // Garantir que todas as opções de margem geram strings perfeitamente casadas
  for (const opt of AVAILABLE_MARGIN_OPTIONS) {
    const stringVal = opt.value.toString();
    const parsed = Number(stringVal);
    assert(!isNaN(parsed) && parsed === opt.value, `String <option value="${stringVal}"> converte de volta para o número ${opt.value}`);
    
    // Verificar que a margem existe no cálculo de pricing
    const row = rPricing.margins.find(m => Math.abs(m.marginPercent - opt.value) < 0.005);
    assert(!!row, `Margem ${opt.label} (${opt.value}) existe em rPricing.margins`);
    assert(Math.abs(row!.directProfit - (rPricing.totalCost * opt.value)) < 0.001, `Lucro da margem ${opt.value} é exatamente Custo * Margem`);
  }

  // Testar especificamente 100%, 200% e 300% (onde antes falhava por '1.0' vs '1')
  const opt100 = AVAILABLE_MARGIN_OPTIONS.find(o => o.value === 1.0)!;
  const opt200 = AVAILABLE_MARGIN_OPTIONS.find(o => o.value === 2.0)!;
  const opt300 = AVAILABLE_MARGIN_OPTIONS.find(o => o.value === 3.0)!;

  assert(opt100.value.toString() === (1.0).toString(), "100% gera a mesma string ('1') no select e no option");
  assert(opt200.value.toString() === (2.0).toString(), "200% gera a mesma string ('2') no select e no option");
  assert(opt300.value.toString() === (3.0).toString(), "300% gera a mesma string ('3') no select e no option");
  
  console.log("\n TODOS OS TESTES PASSARAM COM SUCESSO!");
}

runAsyncTests();
