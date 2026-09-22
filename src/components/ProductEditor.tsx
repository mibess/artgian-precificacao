import React, { useState, useEffect, useRef } from "react";
import { 
  ProductItem, 
  ProductPart, 
  GlobalSettings, 
  Filament, 
  Printer 
} from "../types/pricing";
import { calculatePricing, simulateCustomSalePrice } from "../utils/calculator";
import { parseTimeToHours, formatHoursToTimeString } from "../utils/timeParser";
import { parseSlicerFile, parseSlicerText, SlicerParseResult } from "../utils/slicerParser";
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
  Percent
} from "lucide-react";

interface ProductEditorProps {
  product?: ProductItem | null;
  settings: GlobalSettings;
  filaments: Filament[];
  printers: Printer[];
  onSave: (product: ProductItem) => void;
  onCancel: () => void;
}

export const ProductEditor: React.FC<ProductEditorProps> = ({
  product,
  settings,
  filaments,
  printers,
  onSave,
  onCancel
}) => {
  // Estado básico do produto
  const [name, setName] = useState(product?.name || "");
  const [category, setCategory] = useState(product?.category || "Decoração");
  const [quantityInBatch, setQuantityInBatch] = useState<number>(product?.quantityInBatch || 1);
  const [isMultiPart, setIsMultiPart] = useState<boolean>(product?.isMultiPart || false);
  const [packagingCost, setPackagingCost] = useState<number>(product?.packagingCost ?? 3.00);
  const [accessoriesCost, setAccessoriesCost] = useState<number>(product?.accessoriesCost ?? 0.00);
  
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

  // Simulação personalizada (Venda Direta ou Shopee)
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
      id: "part-" + Date.now() + "-" + (parts.length + 1),
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

  // Importar arquivo do fatiador
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseSlicerFile(file);
      applySlicerResult(result, file.name);
    } catch (err: any) {
      setSlicerFeedback({
        status: "error",
        message: "Falha ao processar arquivo: " + err.message
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    // Se detectou quebra de filamentos AMS (ex: 14g PLA + 3g PLA)
    if (result.partsBreakdown && result.partsBreakdown.length > 1) {
      const newParts: ProductPart[] = result.partsBreakdown.map((p, idx) => ({
        id: "part-" + Date.now() + "-" + idx,
        name: p.name,
        filamentGrams: p.filamentGrams,
        printTimeString: idx === 0 ? result.timeString : "0min",
        printTimeHours: idx === 0 ? result.timeHours : 0
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
        printTimeHours: result.timeHours
      };
      setParts([newPart]);
      setIsMultiPart(false);
    }
  };

  // Construir objeto de produto para o cálculo
  const currentProduct: ProductItem = {
    id: product?.id || ("prod-" + Date.now()),
    name: name || "Novo Produto",
    category,
    quantityInBatch: Math.max(1, Number(quantityInBatch) || 1),
    isMultiPart,
    parts,
    packagingCost: Number(packagingCost) || 0,
    accessoriesCost: Number(accessoriesCost) || 0,
    variableCostPercent: isCustomVariableCost ? (Number(customVariableCostPercent) || 0) : null,
    notes,
    createdAt: product?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Cálculo ao vivo
  const pricing = calculatePricing(currentProduct, settings, filaments, printers);
  const shopeeConfig = settings.marketplaces.find(m => m.id === "shopee");

  // Simulação com preço digitado (Venda Direta e Shopee)
  const numCustomPrice = parseFloat(customPrice.replace(",", ".")) || 0;
  const currentSimCost = viewUnitPrices && currentProduct.quantityInBatch > 1 ? pricing.unitCost : pricing.totalCost;
  const customDirectSim = simulateCustomSalePrice(numCustomPrice, currentSimCost);
  const customShopeeSim = simulateCustomSalePrice(numCustomPrice, currentSimCost, shopeeConfig);
  const activeSim = simChannel === "direct" ? customDirectSim : customShopeeSim;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Por favor, preencha o nome do produto.");
      return;
    }
    onSave(currentProduct);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {product ? ("Editar: " + product.name) : "Cadastrar & Precificar Produto"}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <PrinterIcon className="w-3 h-3" /> Bambu Lab A1
              </span>
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

      {/* Slicer Automation Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-white">Importador Automático de Fatiador & MakerWorld</h3>
            </div>
            <p className="text-xs text-indigo-200/80 max-w-xl">
              Arraste seu arquivo <b>.3mf</b> ou <b>.gcode</b> (Bambu Studio, MakerWorld, Orca, Cura, Prusa). O 3DPrice detecta o <b>nome real</b>, <b>peso em gramas</b> e o <b>tempo de impressão</b>!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              accept=".gcode,.3mf,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs rounded-xl shadow transition-colors"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              Enviar .3mf ou .gcode
            </button>

            <button
              type="button"
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
          <div className={"p-3 rounded-lg text-xs flex items-center gap-2 " + (
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
                <input
                  type="number"
                  min="1"
                  value={quantityInBatch}
                  onChange={(e) => setQuantityInBatch(Math.max(1, parseInt(e.target.value, 10) || 1))}
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
                    onClick={() => {
                      setIsMultiPart(false);
                    }}
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
                Total: <b>{pricing.totalGrams} g</b> • <b>{pricing.totalTimeString}</b>
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
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={part.filamentGrams}
                          onChange={(e) => updatePart(index, "filamentGrams", parseFloat(e.target.value) || 0)}
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
                          {part.printTimeHours.toFixed(2)}h
                        </span>
                      </div>
                      <div className="relative">
                        <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={part.printTimeString}
                          onChange={(e) => updatePart(index, "printTimeString", e.target.value)}
                          placeholder="Ex: 3h30min, 1.5h, 45min"
                          className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-xs"
                        />
                      </div>
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
                        value={part.filamentId || ""}
                        onChange={(e) => updatePart(index, "filamentId", e.target.value || undefined)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-xs"
                      >
                        <option value="">Padrão (R$ {settings.defaultFilamentPricePerKg.toFixed(2)}/kg)</option>
                        {filaments.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.material}) - R$ {f.pricePerKg.toFixed(2)}/kg
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Embalagem (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">R$</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Caixa, plástico bolha, adesivo</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Acessórios (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">R$</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={accessoriesCost}
                    onChange={(e) => setAccessoriesCost(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Argolas, imãs, parafusos, etc.</p>
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
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={customVariableCostPercent}
                        onChange={(e) => setCustomVariableCostPercent(parseFloat(e.target.value) || 0)}
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
                        ⚠️ Margem maior que o padrão (+{(customVariableCostPercent - settings.defaultVariableCostPercent).toFixed(1)}%). Recomendado para peças complexas, com muitos suportes ou risco de empenamento/warping.
                      </span>
                    ) : customVariableCostPercent < settings.defaultVariableCostPercent ? (
                      <span className="text-emerald-700 font-medium">
                        💡 Margem menor que o padrão (-{(settings.defaultVariableCostPercent - customVariableCostPercent).toFixed(1)}%). Indicado para geometrias simples e impressões já testadas sem falhas.
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
                <span>Custo de Filamento ({pricing.totalGrams} g):</span>
                <span className="font-semibold text-slate-800">R$ {pricing.filamentCost.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Custo de Energia ({pricing.totalTimeString}):</span>
                <span className="font-semibold text-slate-800">R$ {pricing.energyCost.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Embalagem:</span>
                <span className="font-semibold text-slate-800">R$ {pricing.packagingCost.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Acessórios:</span>
                <span className="font-semibold text-slate-800">R$ {pricing.accessoriesCost.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-dashed border-slate-200">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-700">R$ {pricing.subtotal.toFixed(2)}</span>
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
                <span className="font-medium text-slate-700">R$ {pricing.variableCost.toFixed(2)}</span>
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
                    R$ {(viewUnitPrices && currentProduct.quantityInBatch > 1 ? pricing.unitCost : pricing.totalCost).toFixed(2)}
                  </span>
                  {currentProduct.quantityInBatch > 1 && !viewUnitPrices && (
                    <p className="text-[11px] text-slate-500 font-medium">
                      (R$ {pricing.unitCost.toFixed(2)} / un)
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
                  {viewUnitPrices && currentProduct.quantityInBatch > 1 ? "Valores Unitários" : "Valores do Lote"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="py-2 px-2.5">Margem</th>
                      <th className="py-2 px-2.5 text-emerald-700 bg-emerald-50/50">Venda Direta</th>
                      <th className="py-2 px-2.5 text-orange-700 bg-orange-50/50">Shopee (20%+4)</th>
                      <th className="py-2 px-2.5 text-right">Lucro Líq.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pricing.margins.map((m) => {
                      const shopee = m.marketplacePrices["shopee"];
                      const directVal = viewUnitPrices && currentProduct.quantityInBatch > 1 ? m.directUnitSalePrice : m.directSalePrice;
                      const shopeeVal = viewUnitPrices && currentProduct.quantityInBatch > 1 ? shopee?.unitSalePrice : shopee?.salePrice;
                      const profitVal = viewUnitPrices && currentProduct.quantityInBatch > 1 ? m.directUnitProfit : m.directProfit;

                      return (
                        <tr key={m.marginLabel} className="hover:bg-slate-50 transition-colors">
                          <td className="py-1.5 px-2.5 font-bold text-slate-700">
                            {m.marginLabel}
                          </td>
                          <td className="py-1.5 px-2.5 font-bold text-emerald-700 bg-emerald-50/30">
                            R$ {directVal.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2.5 font-bold text-orange-700 bg-orange-50/30">
                            R$ {(shopeeVal || 0).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-semibold text-slate-600">
                            +R$ {profitVal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Simulador Rápido de Preço Livre (Venda Direta ou Shopee) */}
            <div className={`rounded-xl p-3.5 space-y-2.5 border transition-colors ${
              simChannel === "direct"
                ? "bg-emerald-50/70 border-emerald-200"
                : "bg-orange-50/70 border-orange-200"
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${
                  simChannel === "direct" ? "text-emerald-950" : "text-orange-950"
                }`}>
                  {simChannel === "direct" ? (
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                  )}
                  Simulador de Preço Livre
                </span>

                {/* Seletor de Canal: Venda Direta vs Shopee */}
                <div className="flex bg-white/90 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setSimChannel("direct")}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                      simChannel === "direct"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>Venda Direta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimChannel("shopee")}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                      simChannel === "shopee"
                        ? "bg-orange-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>Shopee</span>
                  </button>
                </div>
              </div>

              {/* Informação sobre canal selecionado e base de custo */}
              <div className="flex items-center justify-between text-[10px]">
                <span className={simChannel === "direct" ? "text-emerald-700 font-medium" : "text-orange-700 font-medium"}>
                  {simChannel === "direct" ? "Venda Balcão / Pix (Sem taxas de comissão)" : "Shopee (20% comissão + R$ 4,00 taxa fixa)"}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {viewUnitPrices && currentProduct.quantityInBatch > 1 ? "Preço Unitário" : "Preço do Lote"}
                </span>
              </div>

              {/* Input de Preço */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    placeholder="Ex: 35,00"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className={`w-full pl-8 pr-2 py-1.5 text-xs bg-white rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 border ${
                      simChannel === "direct"
                        ? "border-emerald-200 focus:ring-emerald-500"
                        : "border-orange-200 focus:ring-orange-500"
                    }`}
                  />
                </div>
              </div>

              {/* Resultados da Simulação */}
              {numCustomPrice > 0 && (
                <div className={`p-2.5 rounded-lg border text-[11px] space-y-1.5 bg-white ${
                  simChannel === "direct" ? "border-emerald-100 text-slate-600" : "border-orange-100 text-slate-600"
                }`}>
                  {simChannel === "shopee" ? (
                    <>
                      <div className="flex justify-between">
                        <span>Taxa Shopee (20% + R$ 4,00):</span>
                        <span className="font-semibold text-rose-600">-R$ {customShopeeSim.fee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Você recebe na conta:</span>
                        <span className="font-semibold text-slate-800">R$ {customShopeeSim.netReceived.toFixed(2)}</span>
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
                        <span className="font-semibold text-slate-800">R$ {customDirectSim.netReceived.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="font-bold text-slate-800">Seu Lucro Líquido:</span>
                    <span className={"font-black " + (activeSim.netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      R$ {activeSim.netProfit.toFixed(2)} ({activeSim.marginPercent.toFixed(1)}% sobre custo)
                    </span>
                  </div>

                  {/* Comparativo Inteligente entre Venda Direta e Shopee */}
                  <div className="pt-1.5 border-t border-dashed border-slate-200 text-[10px] flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Comparativo pelo mesmo preço:</span>
                    {simChannel === "direct" ? (
                      <span className="text-orange-700 font-semibold">
                        Na Shopee: R$ {customShopeeSim.netProfit.toFixed(2)} ({customShopeeSim.marginPercent.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        Na Venda Direta: R$ {customDirectSim.netProfit.toFixed(2)} ({customDirectSim.marginPercent.toFixed(1)}%)
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
