import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ProductItem, 
  ProductPart, 
  GlobalSettings, 
  Filament, 
  Printer,
  PackagingItem,
  CustomPackagingAddon,
  calculatePackagingTotal
} from "../types/pricing";
import {
  calculatePricing,
  simulateCustomSalePrice,
  formatBRL,
  formatPercent,
  formatNumber,
  describeMarketplaceFees,
  getPrimaryMarketplace
} from "../utils/calculator";
import { createId } from "../utils/ids";
import { parseTimeToHours, formatHoursToTimeString } from "../utils/timeParser";
import { parseSlicerFile, parseSlicerText, SlicerParseResult } from "../utils/slicerParser";
import { NumberInput } from "./NumberInput";
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  FileCode, 
  Plus, 
  Trash2, 
  Sparkles, 
  Clock, 
  Scale, 
  Zap, 
  Box, 
  ShoppingBag, 
  DollarSign,
  TrendingUp,
  CheckCircle2, 
  AlertCircle, 
  Split, 
  Printer as PrinterIcon,
  Percent,
  Package,
  Ruler
} from "lucide-react";

interface ProductEditorProps {
  product?: ProductItem | null;
  settings: GlobalSettings;
  filaments: Filament[];
  printers: Printer[];
  packagings?: PackagingItem[];
  customAddons?: CustomPackagingAddon[];
  onSave: (product: ProductItem) => void;
  onCancel: () => void;
  /** Informa ao App se há alterações não salvas (para avisar antes de sair da tela). */
  onDirtyChange?: (dirty: boolean) => void;
}

export const ProductEditor: React.FC<ProductEditorProps> = ({
  product,
  settings,
  filaments,
  printers,
  packagings = [],
  customAddons = [],
  onSave,
  onCancel,
  onDirtyChange
}) => {
  // Estado básico do produto
  const [name, setName] = useState(product?.name || "");
  const [category, setCategory] = useState(product?.category || "Decoração");
  const [quantityInBatch, setQuantityInBatch] = useState<number>(product?.quantityInBatch || 1);
  const [isMultiPart, setIsMultiPart] = useState<boolean>(product?.isMultiPart || false);

  // Embalagem: Seleção cadastrada vs Valor personalizado
  // Embalagem vinculada que ainda existe no cadastro (se foi excluída, usa o valor gravado como avulso)
  const linkedPackagingExists = Boolean(product?.packagingId && packagings.some(p => p.id === product.packagingId));

  const [selectedPackagingId, setSelectedPackagingId] = useState<string>(() => {
    if (product?.packagingId && linkedPackagingExists) {
      return product.packagingId;
    }
    if (product && typeof product.packagingCost === "number" && packagings.length > 0) {
      const match = packagings.find(p => Math.abs(calculatePackagingTotal(p, customAddons) - product.packagingCost) < 0.01);
      if (match) return match.id;
    }
    if (packagings.length > 0) {
      return packagings[0].id;
    }
    return "";
  });

  const [isCustomPackaging, setIsCustomPackaging] = useState<boolean>(() => {
    if (product?.isCustomPackagingCost === true) {
      return true;
    }
    if (product?.packagingId && !linkedPackagingExists) {
      return true;
    }
    if (product && typeof product.packagingCost === "number") {
      const match = packagings.find(p => Math.abs(calculatePackagingTotal(p, customAddons) - product.packagingCost) < 0.01);
      if (!match && !product.packagingId) {
        return true;
      }
    }
    if (packagings.length === 0) {
      return true;
    }
    return false;
  });

  const [packagingCost, setPackagingCost] = useState<number>(() => {
    if (product && typeof product.packagingCost === "number") {
      return product.packagingCost;
    }
    if (packagings.length > 0) {
      return calculatePackagingTotal(packagings[0], customAddons);
    }
    return 3.00;
  });

  const [accessoriesCost, setAccessoriesCost] = useState<number>(product?.accessoriesCost ?? 0.00);
  const [packagingMode, setPackagingMode] = useState<"perBatch" | "perUnit">(product?.packagingMode === "perUnit" ? "perUnit" : "perBatch");
  const [laborHours, setLaborHours] = useState<number>(product?.laborHours ?? 0);

  // Id e data de criação estáveis para produtos novos (não mudam a cada renderização)
  const [productId] = useState<string>(() => product?.id || createId("prod"));
  const [createdAt] = useState<string>(() => product?.createdAt || new Date().toISOString());
  
  // Margem de Perda / Custo Variável: Padrão do Sistema vs Personalizada
  const [isCustomVariableCost, setIsCustomVariableCost] = useState<boolean>(() => {
    return typeof product?.variableCostPercent === "number" && product.variableCostPercent !== null;
  });
  const [customVariableCostPercent, setCustomVariableCostPercent] = useState<number>(() => {
    if (typeof product?.variableCostPercent === "number" && product.variableCostPercent !== null) {
      return product.variableCostPercent;
    }
    return settings.defaultVariableCostPercent || 10;
  });

  const [notes, setNotes] = useState(product?.notes || "");

  // Partes
  const [parts, setParts] = useState<ProductPart[]>(
    product?.parts && product.parts.length > 0
      ? product.parts
      : [
          {
            id: "part-1",
            name: "Peça Principal",
            filamentGrams: 50,
            printTimeString: "3h30min",
            printTimeHours: 3.5
          }
        ]
  );

  // Nome dinâmico da impressora da peça principal
  // (sem impressora vinculada o cálculo usa a potência padrão das configurações)
  const mainPrinterName = useMemo(() => {
    const pId = parts[0]?.printerId;
    if (pId) {
      const found = printers.find(p => p.id === pId);
      if (found) return found.name;
    }
    const watts = parts[0]?.printerWattsOverride || settings.defaultPrinterWatts;
    return `Impressora padrão (${watts} W)`;
  }, [parts, printers, settings.defaultPrinterWatts]);

  // Alternar com segurança para Peça Única consolidando partes se houver mais de uma
  const handleSwitchToSinglePart = () => {
    if (parts.length > 1) {
      const totalGrams = Math.round(parts.reduce((sum, p) => sum + (p.filamentGrams || 0), 0) * 100) / 100;
      const totalHours = parts.reduce((sum, p) => sum + (p.printTimeHours || 0), 0);
      const confirmMessage = `Você possui ${parts.length} partes configuradas.\n\nDeseja consolidar todas as partes somando seus pesos (${totalGrams}g) e tempos (${formatHoursToTimeString(totalHours)}) em uma única peça principal?`;
      
      if (window.confirm(confirmMessage)) {
        const consolidated: ProductPart = {
          id: parts[0]?.id || "part-1",
          name: "Peça Principal",
          filamentGrams: totalGrams,
          printTimeHours: totalHours,
          printTimeString: formatHoursToTimeString(totalHours),
          filamentId: parts[0]?.filamentId,
          printerId: parts[0]?.printerId,
          filamentPricePerKgOverride: parts[0]?.filamentPricePerKgOverride,
          printerWattsOverride: parts[0]?.printerWattsOverride
        };
        setParts([consolidated]);
        setIsMultiPart(false);
      }
    } else {
      setIsMultiPart(false);
    }
  };

  // Simulação personalizada (Venda Direta ou marketplace principal)
  const [customPrice, setCustomPrice] = useState<string>("");
  const [simChannel, setSimChannel] = useState<"direct" | "shopee">("direct");
  const [viewUnitPrices, setViewUnitPrices] = useState<boolean>(false);

  // Status de importação do fatiador
  const [slicerFeedback, setSlicerFeedback] = useState<{
    status: "idle" | "success" | "warning" | "error";
    message: string;
    details?: SlicerParseResult;
  }>({ status: "idle", message: "" });
  
  const [pasteSlicerOpen, setPasteSlicerOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [makerWorldAssistant, setMakerWorldAssistant] = useState<{
    open: boolean;
    title: string;
    designer: string;
    quickInput: string;
  }>({ open: false, title: "", designer: "", quickInput: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Helper para atualizar parte
  const updatePart = (index: number, field: keyof ProductPart, value: any) => {
    setParts(prev => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };

      if (field === "printTimeString") {
        const parsed = parseTimeToHours(value);
        next[index].printTimeHours = parsed.hours;
      }
      return next;
    });
  };

  const addPart = () => {
    const newPart: ProductPart = {
      id: createId("part"),
      name: "Parte " + (parts.length + 1),
      filamentGrams: 10,
      printTimeString: "1h",
      printTimeHours: 1.0
    };
    setParts(prev => [...prev, newPart]);
    setIsMultiPart(true);
  };

  const removePart = (index: number) => {
    if (parts.length <= 1) return;
    setParts(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 1) setIsMultiPart(false);
      return next;
    });
  };

  // Importar arquivo do fatiador (botão ou arrastar e soltar)
  const importSlicerFile = async (file: File) => {
    if (!/\.(gcode|3mf|txt|log)$/i.test(file.name)) {
      setSlicerFeedback({
        status: "error",
        message: `Formato não suportado: "${file.name}". Envie um arquivo .3mf, .gcode ou .txt.`
      });
      return;
    }

    setIsImporting(true);
    setSlicerFeedback({ status: "idle", message: "" });
    try {
      const result = await parseSlicerFile(file);
      applySlicerResult(result, file.name);
    } catch (err: any) {
      setSlicerFeedback({
        status: "error",
        message: "Falha ao processar arquivo: " + (err?.message || "erro desconhecido")
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importSlicerFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !isImporting) importSlicerFile(file);
  };

  const handlePastedSlicer = () => {
    if (!pastedText.trim()) return;
    const result = parseSlicerText(pastedText);
    applySlicerResult(result, "Texto colado");
    setPasteSlicerOpen(false);
    setPastedText("");
  };

  const handleMakerWorldQuickApply = () => {
    if (!makerWorldAssistant.quickInput.trim()) return;
    const result = parseSlicerText(makerWorldAssistant.quickInput);
    if (result.detected) {
      applyExtractedData(result);
      setMakerWorldAssistant(prev => ({ ...prev, open: false }));
      setSlicerFeedback({
        status: "success",
        message: "Dados do MakerWorld aplicados: " + result.filamentGrams + "g em " + result.timeString + "!"
      });
    } else {
      alert("Não foi possível identificar o peso ou tempo. Tente digitar algo como 1.4h 17g.");
    }
  };

  const applySlicerResult = (result: SlicerParseResult, sourceName: string) => {
    // 1. Atualizar nome do produto com título limpo
    if (result.modelTitle) {
      setName(result.modelTitle);
    } else if (!name) {
      setName(sourceName.replace(/\.(gcode|3mf|txt)$/i, "").replace(/[+_]/g, " ").trim());
    }

    // 2. Se for arquivo de projeto do MakerWorld sem gcode fatiado dentro
    if (result.isMakerWorldProject && result.needsManualTimeOrWeight) {
      setMakerWorldAssistant({
        open: true,
        title: result.modelTitle || "Modelo 3D",
        designer: result.designer || "",
        quickInput: ""
      });
      setSlicerFeedback({
        status: "warning",
        message: "Projeto MakerWorld identificado: \"" + (result.modelTitle || "") + "\". Insira abaixo o tempo e peso da tela do MakerWorld (ex: 1.4h 17g) para concluir o cálculo!"
      });
      return;
    }

    // 3. Se os dados foram detectados com sucesso
    if (result.detected) {
      applyExtractedData(result);
      setSlicerFeedback({
        status: "success",
        message: "Dados importados (" + (result.slicerType || "") + "): " + result.filamentGrams + "g de filamento em " + result.timeString + "!",
        details: result
      });
    } else {
      setSlicerFeedback({
        status: "error",
        message: "Não foi possível detectar peso ou tempo automaticamente. Preencha manualmente nos campos abaixo ou cole o texto do fatiador."
      });
    }
  };

  const applyExtractedData = (result: SlicerParseResult) => {
    // Se detectou quebra de filamentos AMS ou placas
    if (result.partsBreakdown && result.partsBreakdown.length > 1) {
      const newParts: ProductPart[] = result.partsBreakdown.map((p, idx) => ({
        id: createId("part"),
        name: p.name,
        filamentGrams: p.filamentGrams,
        printTimeString: idx === 0 ? result.timeString : "0min",
        printTimeHours: idx === 0 ? result.timeHours : 0,
        filamentId: parts[idx]?.filamentId || parts[0]?.filamentId,
        printerId: parts[idx]?.printerId || parts[0]?.printerId,
        filamentPricePerKgOverride: parts[idx]?.filamentPricePerKgOverride ?? parts[0]?.filamentPricePerKgOverride,
        printerWattsOverride: parts[idx]?.printerWattsOverride ?? parts[0]?.printerWattsOverride
      }));
      setParts(newParts);
      setIsMultiPart(true);
    } else {
      // Peça única com peso total
      const newPart: ProductPart = {
        id: parts[0]?.id || "part-1",
        name: parts[0]?.name || "Peça Principal",
        filamentGrams: result.filamentGrams,
        printTimeString: result.timeString,
        printTimeHours: result.timeHours,
        filamentId: parts[0]?.filamentId,
        printerId: parts[0]?.printerId,
        filamentPricePerKgOverride: parts[0]?.filamentPricePerKgOverride,
        printerWattsOverride: parts[0]?.printerWattsOverride
      };
      setParts([newPart]);
      setIsMultiPart(false);
    }
  };

  const selectedPkg = packagings.find(p => p.id === selectedPackagingId) || packagings[0];
  const isLinkedPackaging = !isCustomPackaging && Boolean(selectedPkg);

  // Construir objeto de produto para o cálculo. Com caixa vinculada, o custo acompanha o cadastro de
  // embalagens (mesmo valor exibido no catálogo); o snapshot gravado é apenas referência.
  const currentProduct: ProductItem = useMemo(() => ({
    id: productId,
    name: name || "Novo Produto",
    category,
    quantityInBatch: Math.max(1, Number(quantityInBatch) || 1),
    isMultiPart,
    parts,
    packagingCost: isLinkedPackaging && selectedPkg
      ? calculatePackagingTotal(selectedPkg, customAddons)
      : Number(packagingCost) || 0,
    packagingId: isLinkedPackaging && selectedPkg ? selectedPkg.id : null,
    isCustomPackagingCost: !isLinkedPackaging,
    packagingMode,
    accessoriesCost: Number(accessoriesCost) || 0,
    laborHours: Math.max(0, Number(laborHours) || 0),
    variableCostPercent: isCustomVariableCost ? (Number(customVariableCostPercent) || 0) : null,
    notes,
    createdAt,
    updatedAt: createdAt
  }), [
    productId, name, category, quantityInBatch, isMultiPart, parts, isLinkedPackaging, selectedPkg, customAddons,
    packagingCost, packagingMode, accessoriesCost, laborHours, isCustomVariableCost, customVariableCostPercent, notes, createdAt
  ]);

  // Alterações não salvas: compara com o estado inicial do formulário
  const formSnapshot = useMemo(() => JSON.stringify({ ...currentProduct, createdAt: null, updatedAt: null }), [currentProduct]);
  const initialSnapshotRef = useRef(formSnapshot);
  const isDirty = formSnapshot !== initialSnapshotRef.current;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  // Cálculo ao vivo
  const pricing = useMemo(
    () => calculatePricing(currentProduct, settings, filaments, printers, packagings, customAddons),
    [currentProduct, settings, filaments, printers, packagings, customAddons]
  );
  const marketplaceConfig = getPrimaryMarketplace(settings);
  const marketplaceFees = marketplaceConfig ? describeMarketplaceFees(marketplaceConfig) : "";
  const isBatch = currentProduct.quantityInBatch > 1;
  const showUnit = viewUnitPrices && isBatch;
  const activeChannel = simChannel === "shopee" && marketplaceConfig ? "shopee" : "direct";

  // Simulação com preço digitado (Venda Direta e marketplace principal)
  const numCustomPrice = parseFloat(customPrice.replace(",", ".")) || 0;
  const currentSimCost = showUnit ? pricing.unitCost : pricing.totalCost;
  const customDirectSim = simulateCustomSalePrice(numCustomPrice, currentSimCost);
  const customShopeeSim = simulateCustomSalePrice(numCustomPrice, currentSimCost, marketplaceConfig);
  const activeSim = activeChannel === "direct" ? customDirectSim : customShopeeSim;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Por favor, preencha o nome do produto.");
      return;
    }
    onSave({ ...currentProduct, name: name.trim(), updatedAt: new Date().toISOString() });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            title="Voltar ao catálogo"
            aria-label="Voltar ao catálogo"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {product ? ("Editar: " + product.name) : "Cadastrar & Precificar Produto"}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <PrinterIcon className="w-3 h-3" aria-hidden="true" /> {mainPrinterName}
              </span>
              {isDirty && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Não salvo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Preencha os dados ou importe do seu fatiador / MakerWorld para calcular o custo e preços automaticamente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-100 rounded-lg transition-all"
          >
            <Save className="w-4 h-4" />
            Salvar Produto
          </button>
        </div>
      </div>

      {/* Slicer Automation Banner (aceita arrastar e soltar o arquivo) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-5 shadow-md space-y-4 transition-shadow ${
          isDragOver ? "ring-4 ring-amber-300/80 ring-offset-2 ring-offset-slate-50" : ""
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-white">Importador Automático de Fatiador & MakerWorld</h3>
            </div>
            <p className="text-xs text-indigo-200/80 max-w-xl">
              {isDragOver
                ? <b className="text-amber-200">Solte o arquivo aqui para importar.</b>
                : <>Arraste seu arquivo <b>.3mf</b> ou <b>.gcode</b> para esta área (Bambu Studio, MakerWorld, Orca, Cura, Prusa). O sistema detecta o <b>nome real</b>, <b>peso em gramas</b> e o <b>tempo de impressão</b>!</>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              accept=".gcode,.3mf,.txt,.log"
              onChange={handleFileUpload}
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              aria-busy={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs rounded-xl shadow transition-colors"
            >
              {isImporting ? (
                <span className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              )}
              {isImporting ? "Processando arquivo..." : "Enviar .3mf ou .gcode"}
            </button>

            <button
              type="button"
              aria-expanded={pasteSlicerOpen}
              onClick={() => setPasteSlicerOpen(!pasteSlicerOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-700/60 hover:bg-indigo-700 text-white font-semibold text-xs border border-indigo-500/40 rounded-xl transition-colors"
            >
              <FileCode className="w-4 h-4 text-indigo-300" />
              Colar Texto da Tela
            </button>
          </div>
        </div>

        {/* Assistente Específico do MakerWorld quando detectado */}
        {makerWorldAssistant.open && (
          <div className="p-4 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-100 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Projeto MakerWorld Detectado: <b>{makerWorldAssistant.title}</b></span>
                {makerWorldAssistant.designer && <span className="text-[11px] font-normal opacity-80">(por {makerWorldAssistant.designer})</span>}
              </div>
              <button
                type="button"
                onClick={() => setMakerWorldAssistant(prev => ({ ...prev, open: false }))}
                className="text-xs text-amber-300/80 hover:text-white"
              >
                ✕ Fechar
              </button>
            </div>

            <p className="text-[11px] text-amber-100/90 leading-relaxed">
              O arquivo <b>.3mf</b> do MakerWorld contém a geometria 3D original. Na tela do MakerWorld / Bambu Handy você visualizou o tempo e peso (ex: <b>1.4 h</b> e <b>17 g</b>)? Digite ou cole abaixo:
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={makerWorldAssistant.quickInput}
                onChange={(e) => setMakerWorldAssistant(prev => ({ ...prev, quickInput: e.target.value }))}
                placeholder="Exemplo: 1.4h 17g (ou cole o texto da tela: 1.4 h, 14g + 3g)"
                className="flex-1 px-3 py-2 text-xs bg-slate-900/80 border border-amber-400/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
              />
              <button
                type="button"
                onClick={handleMakerWorldQuickApply}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Preencher Automaticamente
              </button>
            </div>
          </div>
        )}

        {/* Modal/Box para colar texto livre */}
        {pasteSlicerOpen && (
          <div className="pt-4 border-t border-indigo-700/50 space-y-2">
            <label className="text-xs text-indigo-200 font-medium">
              Cole qualquer texto da tela do MakerWorld, Bambu Handy ou Fatiador (ex: <i>"1 plate 1.4 h 17 g AMS PLA 14g PLA 3g"</i> ou <i>"76g 5h40min"</i>):
            </label>
            <div className="flex gap-2">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Cole o texto aqui..."
                className="flex-1 text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                rows={2}
              />
              <button
                type="button"
                onClick={handlePastedSlicer}
                className="px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Processar
              </button>
            </div>
          </div>
        )}

        {/* Feedback do fatiador */}
        {slicerFeedback.status !== "idle" && (
          <div role={slicerFeedback.status === "error" ? "alert" : "status"} className={"p-3 rounded-lg text-xs flex items-center gap-2 " + (
            slicerFeedback.status === "success"
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
              : slicerFeedback.status === "warning"
              ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
              : "bg-rose-500/20 text-rose-200 border border-rose-500/40"
          )}>
            {slicerFeedback.status === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
            <span>{slicerFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Form Left, Real-Time Calculator Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Fields (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card: Dados Básicos */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Box className="w-4 h-4 text-indigo-600" />
              Informações do Produto
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Articulated Dragon, Rena Branca de Natal..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Decoração, Dragões, Articulados..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Quantidade no Lote</span>
                  <span className="text-[11px] text-slate-400 font-normal">Impressos juntos na mesa</span>
                </label>
                <NumberInput
                  min={1}
                  allowDecimals={false}
                  value={quantityInBatch}
                  onChange={(val) => setQuantityInBatch(Math.max(1, Math.round(val) || 1))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Mode Switcher: Peça Única vs Multi-Peças */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Estrutura do Modelo:</span>
                <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={handleSwitchToSinglePart}
                    className={"px-3 py-1 rounded-md transition-all " + (
                      !isMultiPart ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Peça Única
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMultiPart(true);
                      if (parts.length <= 1) addPart();
                    }}
                    className={"px-3 py-1 rounded-md transition-all " + (
                      isMultiPart ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Multi-Peças / Cores AMS
                  </button>
                </div>
              </div>

              {isMultiPart && (
                <button
                  type="button"
                  onClick={addPart}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Parte
                </button>
              )}
            </div>

          </div>

          {/* Card: Peças e Filamento */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600" />
                {isMultiPart ? "Partes / Cores de Filamento" : "Impressão 3D & Filamento"}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Total: <b>{formatNumber(pricing.totalGrams)} g</b> • <b>{pricing.totalTimeString}</b>
              </span>
            </div>

            <div className="space-y-3">
              {parts.map((part, index) => (
                <div
                  key={part.id || index}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    {isMultiPart ? (
                      <input
                        type="text"
                        aria-label="Nome da parte / cor"
                        value={part.name}
                        onChange={(e) => updatePart(index, "name", e.target.value)}
                        placeholder="Nome da parte / cor (ex: PLA Azul, Olhos)"
                        className="text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-md focus:ring-1 focus:ring-indigo-500"
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-700">Consumo da Impressão</span>
                    )}

                    {isMultiPart && parts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePart(index)}
                        title="Remover parte"
                        aria-label={`Remover ${part.name || "parte"}`}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Peso do Filamento */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                          Peso do Filamento
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">gramas</span>
                      </div>
                      <div className="relative">
                        <NumberInput
                          step="0.1"
                          min={0}
                          aria-label={`Peso do filamento em gramas${isMultiPart ? ` - ${part.name}` : ""}`}
                          value={part.filamentGrams}
                          onChange={(val) => updatePart(index, "filamentGrams", val)}
                          className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-xs"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">g</span>
                      </div>
                    </div>

                    {/* Tempo de impressão flexível */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                          Tempo de Impressão
                        </label>
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                          {formatNumber(Number(part.printTimeHours) || 0, 2, 2)}h
                        </span>
                      </div>
                      {(() => {
                        const timeCheck = parseTimeToHours(part.printTimeString || "");
                        const invalid = Boolean(part.printTimeString?.trim()) && !timeCheck.valid;
                        const hintId = `part-time-hint-${index}`;
                        return (
                          <>
                            <div className="relative">
                              <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                              <input
                                type="text"
                                aria-label={`Tempo de impressão${isMultiPart ? ` - ${part.name}` : ""}`}
                                aria-invalid={invalid}
                                aria-describedby={invalid || timeCheck.warning ? hintId : undefined}
                                value={part.printTimeString}
                                onChange={(e) => updatePart(index, "printTimeString", e.target.value)}
                                placeholder="Ex: 3h30min, 1.5h, 45min"
                                className={`w-full pl-8 pr-3 py-2 text-xs bg-white border rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-xs ${
                                  invalid ? "border-rose-300 bg-rose-50/40" : "border-slate-200"
                                }`}
                              />
                            </div>
                            {invalid ? (
                              <p id={hintId} className="mt-1 text-[10px] font-medium text-rose-600">
                                Formato não reconhecido. Use, por exemplo: 3h30min, 1.5h, 45min ou 02:30.
                              </p>
                            ) : timeCheck.warning ? (
                              <p id={hintId} className="mt-1 text-[10px] font-medium text-amber-700">{timeCheck.warning}</p>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>

                    {/* Seletor de Filamento */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                          Filamento Utilizado
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">custo/kg</span>
                      </div>
                      <select
                        aria-label={`Filamento utilizado${isMultiPart ? ` - ${part.name}` : ""}`}
                        value={part.filamentId || ""}
                        onChange={(e) => updatePart(index, "filamentId", e.target.value || undefined)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-xs"
                      >
                        <option value="">Padrão ({formatBRL(settings.defaultFilamentPricePerKg)}/kg)</option>
                        {filaments.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.material}) - {formatBRL(f.pricePerKg)}/kg
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Seletor de Impressora */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                          Impressora Utilizada
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">potência</span>
                      </div>
                      <select
                        aria-label={`Impressora utilizada${isMultiPart ? ` - ${part.name}` : ""}`}
                        value={part.printerId || ""}
                        onChange={(e) => updatePart(index, "printerId", e.target.value || undefined)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-xs"
                      >
                        <option value="">Padrão ({settings.defaultPrinterWatts} W)</option>
                        {printers.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.powerWatts} W)
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                </div>
              ))}
            </div>

          </div>

          {/* Card: Custos Complementares (Embalagem, Acessórios, Perda) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Box className="w-4 h-4 text-amber-600" />
              Embalagem, Acessórios & Custos Indiretos
            </h3>

            <div className="space-y-4">
              
              {/* LINHA 1: EMBALAGEM DE ENVIO (Linha Dedicada Exclusiva) */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-amber-600" />
                      <span>Embalagem de Envio</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Caixa ou sacola utilizada no despacho, incluindo todos os insumos de proteção e envio.
                    </p>
                  </div>
                  {packagings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isCustomPackaging) {
                          setIsCustomPackaging(false);
                          const chosen = packagings.find(p => p.id === selectedPackagingId) || packagings[0];
                          if (chosen) {
                            setSelectedPackagingId(chosen.id);
                            setPackagingCost(calculatePackagingTotal(chosen, customAddons));
                          }
                        } else {
                          setIsCustomPackaging(true);
                        }
                      }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
                    >
                      {isCustomPackaging ? "← Escolher caixa cadastrada" : "✏️ Inserir valor avulso / manual"}
                    </button>
                  )}
                </div>

                {!isCustomPackaging && packagings.length > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <select
                        value={selectedPackagingId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "__custom__") {
                            setIsCustomPackaging(true);
                          } else {
                            setSelectedPackagingId(val);
                            const chosen = packagings.find(p => p.id === val);
                            if (chosen) {
                              setPackagingCost(calculatePackagingTotal(chosen, customAddons));
                            }
                          }
                        }}
                        className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-2xs"
                      >
                        {packagings.map((pkg) => {
                          const total = calculatePackagingTotal(pkg, customAddons);
                          return (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} ({pkg.width} × {pkg.height} × {pkg.length} cm) — Custo Total: {formatBRL(total)}
                            </option>
                          );
                        })}
                        <option value="__custom__">✏️ Inserir Valor Personalizado / Manual...</option>
                      </select>
                    </div>

                    {/* Card Rico de Informações da Embalagem Selecionada */}
                    {selectedPkg && (
                      <div className="p-4 bg-white border border-amber-200/80 rounded-xl shadow-2xs space-y-3.5">
                        {/* Cabeçalho do Card da Embalagem */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                                {selectedPkg.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Caixa Selecionada
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 font-medium">
                              <Ruler className="w-3.5 h-3.5 text-amber-600" />
                              <span>Dimensões:</span>
                              <span className="font-bold text-slate-800">
                                {selectedPkg.width} cm (Largura) × {selectedPkg.height} cm (Altura) × {selectedPkg.length} cm (Comprimento)
                              </span>
                            </div>
                          </div>

                          <div className="bg-emerald-50/80 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-right self-start sm:self-auto">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                              Custo Total da Embalagem
                            </span>
                            <span className="text-base font-extrabold text-emerald-700 font-mono">
                              {formatBRL(calculatePackagingTotal(selectedPkg, customAddons))}
                            </span>
                          </div>
                        </div>

                        {/* Detalhamento dos Componentes Inclusos */}
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Composição do Custo da Embalagem:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                              <span className="text-[10px] text-slate-500 block font-medium">📦 Caixa / Sacola</span>
                              <span className="font-bold text-slate-800 text-xs">{formatBRL(selectedPkg.boxPrice)}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                              <span className="text-[10px] text-slate-500 block font-medium">🫧 Plástico Bolha</span>
                              <span className="font-bold text-slate-800 text-xs">{formatBRL(selectedPkg.bubbleWrapPrice)}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                              <span className="text-[10px] text-slate-500 block font-medium">🏷️ Adesivo</span>
                              <span className="font-bold text-slate-800 text-xs">{formatBRL(selectedPkg.stickerPrice)}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                              <span className="text-[10px] text-slate-500 block font-medium">📜 Papel Seda</span>
                              <span className="font-bold text-slate-800 text-xs">{formatBRL(selectedPkg.tissuePaperPrice)}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/70 space-y-0.5">
                              <span className="text-[10px] text-amber-900 block font-bold">💌 Cartão Agradecimento</span>
                              <span className="font-bold text-amber-950 text-xs">{formatBRL(selectedPkg.thankYouCardPrice ?? 0.50)}</span>
                            </div>
                          </div>

                          {/* Itens adicionais e personalizados se houver */}
                          {((selectedPkg.otherPrice > 0) || (Array.isArray(selectedPkg.customAddonIds) && selectedPkg.customAddonIds.length > 0)) && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-[10px] text-slate-400 font-semibold">Personalizados Adicionais:</span>
                              {selectedPkg.otherPrice > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                                  <span>✨ {selectedPkg.otherDescription || "Personalizado"}:</span>
                                  <b className="text-slate-900">{formatBRL(selectedPkg.otherPrice)}</b>
                                </span>
                              )}
                              {Array.isArray(selectedPkg.customAddonIds) && selectedPkg.customAddonIds.map(addonId => {
                                const addon = customAddons.find(a => a.id === addonId);
                                if (!addon) return null;
                                return (
                                  <span key={addon.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium text-[11px] border border-indigo-100">
                                    <span>✨ {addon.name}:</span>
                                    <b className="text-indigo-900">{formatBRL(addon.price)}</b>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800">Valor de Embalagem Manual / Avulso</span>
                      {packagings.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomPackaging(false);
                            const chosen = packagings.find(p => p.id === selectedPackagingId) || packagings[0];
                            if (chosen) {
                              setSelectedPackagingId(chosen.id);
                              setPackagingCost(calculatePackagingTotal(chosen, customAddons));
                            }
                          }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer self-start sm:self-auto"
                        >
                          ← Voltar para opções cadastradas
                        </button>
                      )}
                    </div>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                      <NumberInput
                        step="0.1"
                        min={0}
                        value={packagingCost}
                        onChange={(val) => setPackagingCost(val)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-amber-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        placeholder="0,00"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Este valor personalizado será considerado diretamente no custo da peça.
                    </p>
                  </div>
                )}

                {/* Lote com várias unidades: uma embalagem para o lote ou uma por unidade */}
                {isBatch && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-700">
                      Quantas embalagens este lote usa?
                    </span>
                    <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-xs font-semibold self-start sm:self-auto" role="group" aria-label="Modo de embalagem do lote">
                      <button
                        type="button"
                        aria-pressed={packagingMode === "perBatch"}
                        onClick={() => setPackagingMode("perBatch")}
                        className={`px-3 py-1 rounded-md transition-all ${
                          packagingMode === "perBatch" ? "bg-white text-indigo-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        1 para o lote
                      </button>
                      <button
                        type="button"
                        aria-pressed={packagingMode === "perUnit"}
                        onClick={() => setPackagingMode("perUnit")}
                        className={`px-3 py-1 rounded-md transition-all ${
                          packagingMode === "perUnit" ? "bg-white text-indigo-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        1 por unidade (×{currentProduct.quantityInBatch})
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* LINHA 2: ACESSÓRIOS ADICIONAIS (Linha Dedicada Exclusiva - LÓGICA E CAMPOS INTACTOS) */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      <span>Acessórios Adicionais</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Argolas de chaveiro, imãs de neodímio, parafusos, correntes e componentes extras.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-48">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                    <NumberInput
                      step="0.1"
                      min={0}
                      value={accessoriesCost}
                      onChange={(val) => setAccessoriesCost(val)}
                      aria-label="Custo de acessórios adicionais em reais"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              {/* LINHA 3: MÃO DE OBRA / PÓS-PROCESSAMENTO */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label htmlFor="labor-hours" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                      <span>Mão de Obra / Pós-processamento</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {(settings.laborCostPerHour || 0) > 0
                        ? <>Horas de acabamento, pintura e montagem do lote, a {formatBRL(settings.laborCostPerHour || 0)}/h.</>
                        : <>Defina o valor da hora em <b>Insumos &amp; Taxas</b> para incluir no custo.</>}
                    </p>
                  </div>
                  <div className="relative w-full sm:w-48">
                    <NumberInput
                      id="labor-hours"
                      step="0.25"
                      min={0}
                      value={laborHours}
                      onChange={(val) => setLaborHours(val)}
                      className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">h</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Custo Variável / Margem de Falha com Suporte a Personalização */}
            <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Custo Variável / Margem de Falha</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Percentual sobre o subtotal para cobrir perdas, falhas e descartes.
                  </p>
                </div>

                {/* Seletor de Modo: Padrão vs Personalizada */}
                <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-xs font-semibold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsCustomVariableCost(false)}
                    className={`px-3 py-1 rounded-md transition-all ${
                      !isCustomVariableCost
                        ? "bg-white text-indigo-700 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Padrão do Sistema ({settings.defaultVariableCostPercent}%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomVariableCost(true);
                      if (!customVariableCostPercent) {
                        setCustomVariableCostPercent(settings.defaultVariableCostPercent || 10);
                      }
                    }}
                    className={`px-3 py-1 rounded-md transition-all ${
                      isCustomVariableCost
                        ? "bg-indigo-600 text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Personalizada
                  </button>
                </div>
              </div>

              {!isCustomVariableCost ? (
                <div className="flex items-center justify-between text-xs bg-indigo-50/70 border border-indigo-100 rounded-lg px-3 py-2 text-indigo-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-semibold">Utilizando margem padrão global: </span>
                      <strong className="text-indigo-700 font-extrabold">{settings.defaultVariableCostPercent}%</strong>
                      <span className="text-[11px] text-indigo-700/80 block">Definida para toda a oficina (editável em Insumos & Taxas).</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomVariableCost(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline shrink-0 ml-2"
                  >
                    Personalizar →
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-[180px]">
                      <NumberInput
                        step="0.5"
                        min={0}
                        max={100}
                        value={customVariableCostPercent}
                        onChange={(val) => setCustomVariableCostPercent(val)}
                        className="w-full px-3 pr-8 py-2 text-sm bg-white border border-indigo-300 rounded-lg font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-600 font-bold">%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCustomVariableCost(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 underline font-medium"
                    >
                      Voltar ao padrão ({settings.defaultVariableCostPercent}%)
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-tight">
                    {customVariableCostPercent > settings.defaultVariableCostPercent ? (
                      <span className="text-amber-700 font-medium">
                        ⚠️ Margem maior que o padrão (+{formatPercent(customVariableCostPercent - settings.defaultVariableCostPercent)}). Recomendado para peças complexas, com muitos suportes ou risco de empenamento/warping.
                      </span>
                    ) : customVariableCostPercent < settings.defaultVariableCostPercent ? (
                      <span className="text-emerald-700 font-medium">
                        💡 Margem menor que o padrão (-{formatPercent(settings.defaultVariableCostPercent - customVariableCostPercent)}). Indicado para geometrias simples e impressões já testadas sem falhas.
                      </span>
                    ) : (
                      <span>Margem personalizada com o mesmo valor do padrão atual ({settings.defaultVariableCostPercent}%).</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notas / Descrição Técnica
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ex: Altura de camada 0.2mm, bico 0.4mm, infill 15%, link do STL..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

          </div>

        </div>

        {/* Right Column: Real-time Calculation Panel & Pricing Table (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card: Breakdown de Custos */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 sticky top-20">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Resumo de Custos</h3>
                <p className="text-[11px] text-slate-400">Calculado automaticamente com base nos insumos</p>
              </div>

              {currentProduct.quantityInBatch > 1 && (
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setViewUnitPrices(false)}
                    className={"px-2 py-1 rounded-md transition-all " + (!viewUnitPrices ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500")}
                  >
                    Lote Total
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewUnitPrices(true)}
                    className={"px-2 py-1 rounded-md transition-all " + (viewUnitPrices ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500")}
                  >
                    Por Unidade
                  </button>
                </div>
              )}
            </div>

            {/* Linhas de Custo */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Custo de Filamento ({formatNumber(pricing.totalGrams)} g):</span>
                <span className="font-semibold text-slate-800">{formatBRL(pricing.filamentCost)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Custo de Energia ({pricing.totalTimeString}):</span>
                <span className="font-semibold text-slate-800">{formatBRL(pricing.energyCost)}</span>
              </div>

              {pricing.machineCost > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Máquina (depreciação):</span>
                  <span className="font-semibold text-slate-800">{formatBRL(pricing.machineCost)}</span>
                </div>
              )}

              {pricing.laborCost > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Mão de obra ({formatNumber(currentProduct.laborHours || 0)} h):</span>
                  <span className="font-semibold text-slate-800">{formatBRL(pricing.laborCost)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600">
                <span>Embalagem{isBatch && packagingMode === "perUnit" ? ` (×${currentProduct.quantityInBatch})` : ""}:</span>
                <span className="font-semibold text-slate-800">{formatBRL(pricing.packagingCost)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Acessórios:</span>
                <span className="font-semibold text-slate-800">{formatBRL(pricing.accessoriesCost)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-dashed border-slate-200">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-700">{formatBRL(pricing.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span>Custo Variável ({pricing.variableCostPercent}%):</span>
                  {pricing.isCustomVariableCost ? (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Personalizado</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-normal">(Padrão)</span>
                  )}
                </span>
                <span className="font-medium text-slate-700">{formatBRL(pricing.variableCost)}</span>
              </div>

              {/* Total Destacado */}
              <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                <div>
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                    Custo Final de Produção
                  </span>
                  {currentProduct.quantityInBatch > 1 && (
                    <span className="text-[11px] text-indigo-700 font-semibold">
                      (Lote com {currentProduct.quantityInBatch} unidades)
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-indigo-700">
                    {formatBRL(showUnit ? pricing.unitCost : pricing.totalCost)}
                  </span>
                  {isBatch && !viewUnitPrices && (
                    <p className="text-[11px] text-slate-500 font-medium">
                      ({formatBRL(pricing.unitCost)} / un)
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* Tabela de Margens de Venda */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">Tabela de Preços Sugeridos</h4>
                <span className="text-[10px] text-slate-400 font-medium">
                  {showUnit ? "Valores Unitários" : "Valores do Lote"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="py-2 px-2.5">Margem</th>
                      <th className="py-2 px-2.5 text-emerald-700 bg-emerald-50/50">Venda Direta</th>
                      {marketplaceConfig && (
                        <th className="py-2 px-2.5 text-orange-700 bg-orange-50/50" title={`${marketplaceConfig.name}: ${marketplaceFees}`}>
                          {marketplaceConfig.name} ({marketplaceFees})
                        </th>
                      )}
                      <th className="py-2 px-2.5 text-right">Lucro Líq.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pricing.margins.map((m) => {
                      const shopee = marketplaceConfig ? m.marketplacePrices[marketplaceConfig.id] : undefined;
                      const directVal = showUnit ? m.directUnitSalePrice : m.directSalePrice;
                      const shopeeVal = showUnit ? shopee?.unitSalePrice : shopee?.salePrice;
                      const profitVal = showUnit ? m.directUnitProfit : m.directProfit;

                      return (
                        <tr key={m.marginLabel} className="hover:bg-slate-50 transition-colors">
                          <td className="py-1.5 px-2.5 font-bold text-slate-700">
                            {m.marginLabel}
                          </td>
                          <td className="py-1.5 px-2.5 font-bold text-emerald-700 bg-emerald-50/30">
                            {formatBRL(directVal)}
                          </td>
                          {marketplaceConfig && (
                            <td className="py-1.5 px-2.5 font-bold text-orange-700 bg-orange-50/30">
                              {formatBRL(shopeeVal || 0)}
                            </td>
                          )}
                          <td className="py-1.5 px-2.5 text-right font-semibold text-slate-600">
                            +{formatBRL(profitVal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Simulador Rápido de Preço Livre (Venda Direta ou marketplace principal) */}
            <div className={`rounded-xl p-3.5 space-y-2.5 border transition-colors ${
              activeChannel === "direct"
                ? "bg-emerald-50/70 border-emerald-200"
                : "bg-orange-50/70 border-orange-200"
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${
                  activeChannel === "direct" ? "text-emerald-950" : "text-orange-950"
                }`}>
                  {activeChannel === "direct" ? (
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                  )}
                  Simulador de Preço Livre
                </span>

                {/* Seletor de Canal: Venda Direta vs marketplace principal */}
                <div className="flex bg-white/90 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold shadow-2xs">
                  <button
                    type="button"
                    aria-pressed={activeChannel === "direct"}
                    onClick={() => setSimChannel("direct")}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                      activeChannel === "direct"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>Venda Direta</span>
                  </button>
                  {marketplaceConfig && (
                  <button
                    type="button"
                    aria-pressed={activeChannel === "shopee"}
                    onClick={() => setSimChannel("shopee")}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                      activeChannel === "shopee"
                        ? "bg-orange-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{marketplaceConfig.name}</span>
                  </button>
                  )}
                </div>
              </div>

              {/* Informação sobre canal selecionado e base de custo */}
              <div className="flex items-center justify-between text-[10px]">
                <span className={activeChannel === "direct" ? "text-emerald-700 font-medium" : "text-orange-700 font-medium"}>
                  {activeChannel === "direct" ? "Venda Balcão / Pix (Sem taxas de comissão)" : `${marketplaceConfig?.name} (${marketplaceFees})`}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {showUnit ? "Preço Unitário" : "Preço do Lote"}
                </span>
              </div>

              {/* Input de Preço */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Preço de venda para simular"
                    placeholder="Ex: 35,00"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className={`w-full pl-8 pr-2 py-1.5 text-xs bg-white rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 border ${
                      activeChannel === "direct"
                        ? "border-emerald-200 focus:ring-emerald-500"
                        : "border-orange-200 focus:ring-orange-500"
                    }`}
                  />
                </div>
              </div>

              {/* Resultados da Simulação */}
              {numCustomPrice > 0 && (
                <div className={`p-2.5 rounded-lg border text-[11px] space-y-1.5 bg-white ${
                  activeChannel === "direct" ? "border-emerald-100 text-slate-600" : "border-orange-100 text-slate-600"
                }`}>
                  {activeChannel === "shopee" ? (
                    <>
                      <div className="flex justify-between">
                        <span>Taxa {marketplaceConfig?.name} ({marketplaceFees}):</span>
                        <span className="font-semibold text-rose-600">-{formatBRL(customShopeeSim.fee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Você recebe na conta:</span>
                        <span className="font-semibold text-slate-800">{formatBRL(customShopeeSim.netReceived)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>Taxa de Intermediação:</span>
                        <span className="font-semibold text-emerald-600">R$ 0,00 (Sem desconto)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Você recebe na conta:</span>
                        <span className="font-semibold text-slate-800">{formatBRL(customDirectSim.netReceived)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="font-bold text-slate-800">Seu Lucro Líquido:</span>
                    <span className={"font-black " + (activeSim.netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {formatBRL(activeSim.netProfit)} ({formatPercent(activeSim.markupPercent)} sobre custo • {formatPercent(activeSim.marginPercent)} margem)
                    </span>
                  </div>

                  {/* Comparativo Inteligente entre Venda Direta e marketplace */}
                  <div className="pt-1.5 border-t border-dashed border-slate-200 text-[10px] flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Comparativo pelo mesmo preço:</span>
                    {activeChannel === "direct" ? (
                      <span className="text-orange-700 font-semibold">
                        {marketplaceConfig ? <>No canal {marketplaceConfig.name}: {formatBRL(customShopeeSim.netProfit)}</> : null} ({formatPercent(customShopeeSim.markupPercent)} markup)
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        Na Venda Direta: {formatBRL(customDirectSim.netProfit)} ({formatPercent(customDirectSim.markupPercent)} markup)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </form>
  );
};
