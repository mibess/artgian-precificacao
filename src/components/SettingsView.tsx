import React, { useState, useEffect } from "react";
import { 
  ProductItem,
  ProductPart,
  GlobalSettings, 
  Filament, 
  Printer, 
  MarketplaceConfig,
  PackagingItem,
  CustomPackagingAddon,
  calculatePackagingTotal
} from "../types/pricing";
import { NumberInput } from "./NumberInput";
import { 
  Zap, 
  Printer as PrinterIcon, 
  Scale, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  Check, 
  Info,
  Layers,
  Package,
  Copy,
  Ruler,
  Sparkles,
  HeartHandshake,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from "lucide-react";

interface SettingsViewProps {
  products?: ProductItem[];
  settings: GlobalSettings;
  filaments: Filament[];
  printers: Printer[];
  packagings?: PackagingItem[];
  customAddons?: CustomPackagingAddon[];
  onSaveSettings: (settings: GlobalSettings) => void;
  onSaveFilaments: (filaments: Filament[]) => void;
  onSavePrinters: (printers: Printer[]) => void;
  onSavePackagings?: (packagings: PackagingItem[]) => void;
  onSaveCustomAddons?: (customAddons: CustomPackagingAddon[]) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  products = [],
  settings,
  filaments,
  printers,
  packagings = [],
  customAddons = [],
  onSaveSettings,
  onSaveFilaments,
  onSavePrinters,
  onSavePackagings,
  onSaveCustomAddons
}) => {
  const [localSettings, setLocalSettings] = useState<GlobalSettings>({ ...settings });
  const [localFilaments, setLocalFilaments] = useState<Filament[]>([...filaments]);
  const [localPrinters, setLocalPrinters] = useState<Printer[]>([...printers]);
  const [localPackagings, setLocalPackagings] = useState<PackagingItem[]>([...packagings]);
  const [localCustomAddons, setLocalCustomAddons] = useState<CustomPackagingAddon[]>([...customAddons]);
  const [packagingActiveTab, setPackagingActiveTab] = useState<"boxes" | "addons">("boxes");
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [standardBubble, setStandardBubble] = useState<number>(() => {
    return packagings[0]?.bubbleWrapPrice ?? 0.70;
  });
  const [standardSticker, setStandardSticker] = useState<number>(() => {
    return packagings[0]?.stickerPrice ?? 0.18;
  });
  const [standardTissue, setStandardTissue] = useState<number>(() => {
    return packagings[0]?.tissuePaperPrice ?? 0.11;
  });
  const [standardCard, setStandardCard] = useState<number>(() => {
    return packagings[0]?.thankYouCardPrice ?? 0.50;
  });
  const [expandedPackagingId, setExpandedPackagingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty && packagings && packagings.length > 0) {
      setLocalPackagings([...packagings]);
      if (typeof packagings[0].bubbleWrapPrice === "number") setStandardBubble(packagings[0].bubbleWrapPrice);
      if (typeof packagings[0].stickerPrice === "number") setStandardSticker(packagings[0].stickerPrice);
      if (typeof packagings[0].tissuePaperPrice === "number") setStandardTissue(packagings[0].tissuePaperPrice);
      if (typeof packagings[0].thankYouCardPrice === "number") setStandardCard(packagings[0].thankYouCardPrice);
    }
  }, [packagings, isDirty]);

  useEffect(() => {
    if (!isDirty && customAddons) {
      setLocalCustomAddons([...customAddons]);
    }
  }, [customAddons, isDirty]);

  // Manipular Filamentos
  const addFilament = () => {
    const newF: Filament = {
      id: `fil-${Date.now()}`,
      name: "Novo Filamento",
      brand: "Genérico",
      material: "PLA",
      pricePerKg: localSettings.defaultFilamentPricePerKg,
      colorHex: "#6366f1"
    };
    setLocalFilaments([...localFilaments, newF]);
  };

  const updateFilament = (index: number, field: keyof Filament, val: any) => {
    const next = [...localFilaments];
    next[index] = { ...next[index], [field]: val };
    setLocalFilaments(next);
    setIsDirty(true);
  };

  const removeFilament = (id: string) => {
    const inUse = products.filter(p => p.parts.some((pt: ProductPart) => pt.filamentId === id));
    if (inUse.length > 0) {
      const names = inUse.slice(0, 3).map(p => p.name).join(", ");
      const extra = inUse.length > 3 ? ` e mais ${inUse.length - 3}` : "";
      if (!window.confirm(`Este filamento está sendo usado em ${inUse.length} produto(s) (${names}${extra}). Se você excluí-lo, eles passarão a calcular com o valor padrão. Deseja realmente remover?`)) {
        return;
      }
    }
    setLocalFilaments(localFilaments.filter(f => f.id !== id));
    setIsDirty(true);
  };

  // Manipular Impressoras
  const addPrinter = () => {
    const newP: Printer = {
      id: `prn-${Date.now()}`,
      name: "Nova Impressora",
      powerWatts: localSettings.defaultPrinterWatts,
      notes: "Consumo médio de trabalho"
    };
    setLocalPrinters([...localPrinters, newP]);
    setIsDirty(true);
  };

  const updatePrinter = (index: number, field: keyof Printer, val: any) => {
    const next = [...localPrinters];
    next[index] = { ...next[index], [field]: val };
    setLocalPrinters(next);
    setIsDirty(true);
  };

  const removePrinter = (id: string) => {
    const inUse = products.filter(p => p.parts.some((pt: ProductPart) => pt.printerId === id));
    if (inUse.length > 0) {
      const names = inUse.slice(0, 3).map(p => p.name).join(", ");
      const extra = inUse.length > 3 ? ` e mais ${inUse.length - 3}` : "";
      if (!window.confirm(`Esta impressora está sendo usada em ${inUse.length} produto(s) (${names}${extra}). Se você excluí-la, eles calcularão com a potência padrão. Deseja realmente remover?`)) {
        return;
      }
    }
    setLocalPrinters(localPrinters.filter(p => p.id !== id));
    setIsDirty(true);
  };

  // Manipular Embalagens
  const addPackaging = () => {
    const newPkg: PackagingItem = {
      id: `pkg-${Date.now()}`,
      name: "Nova Caixa / Embalagem",
      width: 15,
      height: 10,
      length: 20,
      boxPrice: 1.50,
      bubbleWrapPrice: 0.70,
      stickerPrice: 0.18,
      tissuePaperPrice: 0.11,
      thankYouCardPrice: 0.50,
      otherPrice: 0.00,
      otherDescription: ""
    };
    setLocalPackagings([...localPackagings, newPkg]);
    setIsDirty(true);
  };

  const updatePackaging = (index: number, field: keyof PackagingItem, val: any) => {
    const next = [...localPackagings];
    next[index] = { ...next[index], [field]: val };
    setLocalPackagings(next);
    setIsDirty(true);
  };

  const duplicatePackaging = (pkg: PackagingItem) => {
    const duplicated: PackagingItem = {
      ...pkg,
      id: `pkg-${Date.now()}`,
      name: `${pkg.name} (Cópia)`
    };
    setLocalPackagings([...localPackagings, duplicated]);
    setIsDirty(true);
  };

  const removePackaging = (id: string) => {
    const inUse = products.filter(p => p.packagingId === id);
    if (inUse.length > 0) {
      const names = inUse.slice(0, 3).map(p => p.name).join(", ");
      const extra = inUse.length > 3 ? ` e mais ${inUse.length - 3}` : "";
      if (!window.confirm(`Esta embalagem está selecionada em ${inUse.length} produto(s) (${names}${extra}). Se você excluí-la, o vínculo com a caixa será removido. Deseja realmente remover?`)) {
        return;
      }
    }
    setLocalPackagings(localPackagings.filter(p => p.id !== id));
    setIsDirty(true);
  };

  // Manipular Itens Personalizados Gravados (Addons)
  const addCustomAddon = () => {
    const newAddon: CustomPackagingAddon = {
      id: `addon-${Date.now()}`,
      name: "Novo Personalizado",
      price: 0.50,
      description: ""
    };
    setLocalCustomAddons([...localCustomAddons, newAddon]);
  };

  const updateCustomAddon = (index: number, field: keyof CustomPackagingAddon, val: any) => {
    const next = [...localCustomAddons];
    next[index] = { ...next[index], [field]: val };
    setLocalCustomAddons(next);
  };

  const removeCustomAddon = (id: string) => {
    setLocalCustomAddons(localCustomAddons.filter(a => a.id !== id));
  };

  // Aplicar insumos padrão em todas as caixas
  const applyStandardInsertsToAllBoxes = (
    bubble = standardBubble,
    sticker = standardSticker,
    tissue = standardTissue,
    card = standardCard
  ) => {
    const next = localPackagings.map(pkg => ({
      ...pkg,
      bubbleWrapPrice: bubble,
      stickerPrice: sticker,
      tissuePaperPrice: tissue,
      thankYouCardPrice: card
    }));
    setLocalPackagings(next);
    alert(`Insumos de proteção (Bolha R$ ${bubble.toFixed(2)}, Adesivo R$ ${sticker.toFixed(2)}, Seda R$ ${tissue.toFixed(2)} e Cartão R$ ${card.toFixed(2)}) aplicados em todas as ${next.length} caixas com sucesso!`);
  };

  const togglePackagingAddon = (pkgIndex: number, addonId: string) => {
    const pkg = localPackagings[pkgIndex];
    const currentAddons = Array.isArray(pkg.customAddonIds) ? pkg.customAddonIds : [];
    const has = currentAddons.includes(addonId);
    const nextAddons = has ? currentAddons.filter(id => id !== addonId) : [...currentAddons, addonId];
    updatePackaging(pkgIndex, "customAddonIds", nextAddons);
  };

  // Manipular Marketplaces
  const updateMarketplace = (id: string, field: keyof MarketplaceConfig, val: any) => {
    const nextMps = localSettings.marketplaces.map(m => {
      if (m.id === id) {
        return { ...m, [field]: val };
      }
      return m;
    });
    setLocalSettings({ ...localSettings, marketplaces: nextMps });
  };

  const handleSaveAll = () => {
    setIsDirty(false);
    onSaveSettings(localSettings);
    onSaveFilaments(localFilaments);
    onSavePrinters(localPrinters);
    if (onSavePackagings) {
      onSavePackagings(localPackagings);
    }
    if (onSaveCustomAddons) {
      onSaveCustomAddons(localCustomAddons);
    }
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  return (
    <div className="w-full space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Configuração de Insumos & Parâmetros Globais
          </h2>
          <p className="text-xs text-slate-500">
            Altere os custos de energia, preço dos filamentos e taxas de comissão da Shopee e outros canais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm rounded-lg transition-all"
          >
            {savedFeedback ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            {savedFeedback ? "Salvo com Sucesso!" : "Salvar Alterações"}
          </button>
        </div>
      </div>

      {/* Grid: Parâmetros Base & Marketplaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card: Parâmetros Base da Planilha */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Parâmetros Gerais de Produção
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tarifa de Energia (R$/kWh)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">R$</span>
                <NumberInput
                  step="0.01"
                  min={0}
                  value={localSettings.energyKwhPrice}
                  onChange={(val) => setLocalSettings({ ...localSettings, energyKwhPrice: val })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Valor na planilha de referência: R$ 1,02 / kWh</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preço Padrão de Filamento (R$/kg)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">R$</span>
                <NumberInput
                  step="0.50"
                  min={0}
                  value={localSettings.defaultFilamentPricePerKg}
                  onChange={(val) => setLocalSettings({ ...localSettings, defaultFilamentPricePerKg: val })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Equivale a R$ {(localSettings.defaultFilamentPricePerKg / 1000).toFixed(3)} por grama</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Potência Média Padrão da Impressora (Watts)
              </label>
              <div className="relative">
                <NumberInput
                  step="5"
                  min={0}
                  allowDecimals={false}
                  value={localSettings.defaultPrinterWatts}
                  onChange={(val) => setLocalSettings({ ...localSettings, defaultPrinterWatts: Math.round(val) })}
                  className="w-full px-3 pr-8 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">W</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Valor na planilha: 95 W (custo de R$ {((localSettings.defaultPrinterWatts / 1000) * localSettings.energyKwhPrice).toFixed(4)}/hora)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custo Variável Padrão / Margem de Falha (%)
              </label>
              <div className="relative">
                <NumberInput
                  step="1"
                  min={0}
                  max={100}
                  value={localSettings.defaultVariableCostPercent}
                  onChange={(val) => setLocalSettings({ ...localSettings, defaultVariableCostPercent: val })}
                  className="w-full px-3 pr-8 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Percentual base aplicado a todos os produtos que utilizam a margem padrão global do sistema.</p>
            </div>

            {/* Custo de Máquina por Hora */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Depreciação & Manutenção de Máquina (R$/hora)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">R$</span>
                <NumberInput
                  step="0.50"
                  min={0}
                  value={localSettings.machineCostPerHour || 0}
                  onChange={(val) => setLocalSettings({ ...localSettings, machineCostPerHour: val })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Opcional. Cobre amortização, bicos, correias e peças de reposição por hora de impressão.</p>
            </div>

            {/* Mão de Obra por Hora */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mão de Obra / Acabamento (R$/hora)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">R$</span>
                <NumberInput
                  step="1.00"
                  min={0}
                  value={localSettings.laborCostPerHour || 0}
                  onChange={(val) => setLocalSettings({ ...localSettings, laborCostPerHour: val })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Opcional. Valor por hora de dedicação humana para acabamento, suporte e pintura.</p>
            </div>

            {/* Checkbox Perda sobre embalagem */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <label htmlFor="var-loss-packaging" className="text-xs font-semibold text-slate-700 cursor-pointer block">
                  Taxa de perda sobre caixas & acessórios
                </label>
                <p className="text-[10px] text-slate-400">Aplica a taxa de falha também ao custo de embalagens e itens extras.</p>
              </div>
              <input
                type="checkbox"
                id="var-loss-packaging"
                checked={localSettings.variableCostAppliesToPackaging !== false}
                onChange={(e) => setLocalSettings({ ...localSettings, variableCostAppliesToPackaging: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Card: Marketplaces e Canais */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-orange-600" />
            Taxas de Marketplaces (Shopee, ML, etc.)
          </h3>

          <div className="space-y-4">
            {localSettings.marketplaces.map((mp) => (
              <div key={mp.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`mp-check-${mp.id}`}
                      checked={mp.enabled}
                      onChange={(e) => updateMarketplace(mp.id, "enabled", e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor={`mp-check-${mp.id}`} className="text-xs font-bold text-slate-800 cursor-pointer">
                      {mp.name}
                    </label>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">Canal Ativo</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Comissão (%)
                    </label>
                    <div className="relative">
                      <NumberInput
                        step="0.5"
                        min={0}
                        max={100}
                        value={mp.commissionPercent}
                        onChange={(val) => updateMarketplace(mp.id, "commissionPercent", val)}
                        className="w-full px-2.5 pr-6 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Taxa Fixa (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                      <NumberInput
                        step="0.5"
                        min={0}
                        value={mp.fixedFee}
                        onChange={(val) => updateMarketplace(mp.id, "fixedFee", val)}
                        className="w-full pl-7 pr-2 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Teto Máx. Comissão (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                      <NumberInput
                        step="5"
                        min={0}
                        placeholder="Opcional"
                        value={mp.commissionCap || 0}
                        onChange={(val) => updateMarketplace(mp.id, "commissionCap", val > 0 ? val : undefined)}
                        className="w-full pl-7 pr-2 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Preço Mín. Taxa Fixa (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                      <NumberInput
                        step="5"
                        min={0}
                        placeholder="Opcional"
                        value={mp.fixedFeeMinPrice || 0}
                        onChange={(val) => updateMarketplace(mp.id, "fixedFeeMinPrice", val > 0 ? val : undefined)}
                        className="w-full pl-7 pr-2 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-lg text-[11px] text-amber-800 flex gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              A Shopee cobra <b>20% de comissão + R$ 4,00 por item</b> vendido. O sistema recalcula o preço final para que você receba exatamente o mesmo lucro líquido da venda direta.
            </span>
          </div>

        </div>

      </div>

      {/* Tabela de Insumos: Filamentos */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600" />
              Estoque de Filamentos & Preço por Quilo
            </h3>
            <p className="text-[11px] text-slate-400">Cadastre seus carretéis para associar a peças específicas</p>
          </div>
          <button
            type="button"
            onClick={addFilament}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Filamento
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Nome / Identificação</th>
                <th className="py-2.5 px-3">Material</th>
                <th className="py-2.5 px-3">Marca</th>
                <th className="py-2.5 px-3">Preço / kg (R$)</th>
                <th className="py-2.5 px-3">Custo / g</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {localFilaments.map((fil, idx) => (
                <tr key={fil.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={fil.name}
                      onChange={(e) => updateFilament(idx, "name", e.target.value)}
                      className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={fil.material}
                      onChange={(e) => updateFilament(idx, "material", e.target.value)}
                      className="bg-transparent border border-slate-200 rounded px-1.5 py-0.5"
                    >
                      <option value="PLA">PLA</option>
                      <option value="PETG">PETG</option>
                      <option value="ABS">ABS</option>
                      <option value="Silk">Silk</option>
                      <option value="TPU">TPU</option>
                      <option value="Nylon">Nylon</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={fil.brand}
                      onChange={(e) => updateFilament(idx, "brand", e.target.value)}
                      className="text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-24"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1 font-bold text-slate-800">
                      <span>R$</span>
                      <input
                        type="number"
                        step="1"
                        value={fil.pricePerKg}
                        onChange={(e) => updateFilament(idx, "pricePerKg", parseFloat(e.target.value) || 0)}
                        className="w-20 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-3 text-slate-500 font-mono">
                    R$ {(fil.pricePerKg / 1000).toFixed(3)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeFilament(fil.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela de Máquinas / Impressoras */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <PrinterIcon className="w-4 h-4 text-indigo-600" />
              Parque de Impressoras 3D & Potência
            </h3>
            <p className="text-[11px] text-slate-400">Configure os modelos e seus consumos nominais em Watts</p>
          </div>
          <button
            type="button"
            onClick={addPrinter}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Impressora
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Modelo da Impressora</th>
                <th className="py-2.5 px-3">Potência Média (W)</th>
                <th className="py-2.5 px-3">Custo por Hora (R$)</th>
                <th className="py-2.5 px-3">Notas</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {localPrinters.map((prn, idx) => {
                const costPerHour = (prn.powerWatts / 1000) * localSettings.energyKwhPrice;
                return (
                  <tr key={prn.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={prn.name}
                        onChange={(e) => updatePrinter(idx, "name", e.target.value)}
                        className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <input
                          type="number"
                          step="5"
                          value={prn.powerWatts}
                          onChange={(e) => updatePrinter(idx, "powerWatts", parseInt(e.target.value, 10) || 0)}
                          className="w-16 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                        <span>W</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-indigo-600 font-bold font-mono">
                      R$ {costPerHour.toFixed(4)}/h
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={prn.notes || ""}
                        onChange={(e) => updatePrinter(idx, "notes", e.target.value)}
                        placeholder="Observações..."
                        className="text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-[11px]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => removePrinter(prn.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card: Cadastro de Embalagens & Personalizados */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              Cadastro de Embalagens & Insumos de Envio
            </h3>
            <p className="text-[11px] text-slate-400">
              Cadastre suas caixas com dimensões e custos de proteção (caixa, plástico bolha, adesivo, seda, cartão de agradecimento e personalizados gravados).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Navegação por Sub-Abas do Card */}
            <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPackagingActiveTab("boxes")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  packagingActiveTab === "boxes"
                    ? "bg-white text-indigo-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📦 Caixas ({localPackagings.length})
              </button>
              <button
                type="button"
                onClick={() => setPackagingActiveTab("addons")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  packagingActiveTab === "addons"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Personalizados Gravados ({localCustomAddons.length})</span>
              </button>
            </div>

            {packagingActiveTab === "boxes" && (
              <button
                type="button"
                onClick={addPackaging}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Caixa
              </button>
            )}

            {packagingActiveTab === "addons" && (
              <button
                type="button"
                onClick={addCustomAddon}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Personalizado
              </button>
            )}
          </div>
        </div>

        {/* ================= ABA 1: MODELOS DE CAIXAS ================= */}
        {packagingActiveTab === "boxes" && (
          <div className="space-y-4">
            {/* Bloco de Insumos Fixos de Proteção e Envio */}
            <div className="p-4 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-slate-50 border border-amber-200/80 rounded-xl space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-amber-200/40">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-amber-600" />
                    <span>Insumos Fixos de Proteção & Envio (Inclusos em Todas as Caixas)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Custos padrão de proteção que acompanham cada envio (Subtotal fixo: <b className="text-amber-900">R$ {(standardBubble + standardSticker + standardTissue + standardCard).toFixed(2)}</b>).
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyStandardInsertsToAllBoxes(standardBubble, standardSticker, standardTissue, standardCard)}
                    className="text-xs font-bold px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    ⚡ Sincronizar Insumos em Todas as Caixas
                  </button>
                  <button
                    type="button"
                    onClick={() => setPackagingActiveTab("addons")}
                    className="text-xs font-semibold px-2.5 py-1.5 text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                  >
                    ✨ Gerenciar Personalizados Extras →
                  </button>
                </div>
              </div>

              {/* 4 Cards de Insumos Fixos Editáveis */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block">🫧 Plástico Bolha</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={standardBubble}
                      onChange={(e) => setStandardBubble(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block">🏷️ Adesivo Personalizado</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.02"
                      min="0"
                      value={standardSticker}
                      onChange={(e) => setStandardSticker(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block">📜 Papel Seda 50x70</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={standardTissue}
                      onChange={(e) => setStandardTissue(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="bg-amber-100/60 p-2.5 rounded-lg border border-amber-300 shadow-2xs space-y-1">
                  <span className="text-[10px] text-amber-900 font-extrabold block">💌 Cartão de Agradecimento</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-amber-600 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={standardCard}
                      onChange={(e) => setStandardCard(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-amber-950 bg-white border border-amber-300 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Lista e Tabela de Caixas Cadastradas */}
            {localPackagings.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 space-y-2">
                <Package className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold">Nenhuma embalagem cadastrada no momento.</p>
                <button
                  type="button"
                  onClick={addPackaging}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Clique aqui para adicionar sua primeira embalagem
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[180px]">Nome da Embalagem / Caixa</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Tamanhos (L × A × C cm)</th>
                      <th className="py-2.5 px-3 w-28">Caixa (R$)</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Proteção & Insumos Inclusos</th>
                      <th className="py-2.5 px-3 w-28">Custo Total</th>
                      <th className="py-2.5 px-3 text-right w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {localPackagings.map((pkg, idx) => {
                      const total = calculatePackagingTotal(pkg, localCustomAddons);
                      const isExpanded = expandedPackagingId === pkg.id;
                      const protectionSum = (Number(pkg.bubbleWrapPrice) || 0) + 
                                            (Number(pkg.stickerPrice) || 0) + 
                                            (Number(pkg.tissuePaperPrice) || 0) + 
                                            (Number(pkg.thankYouCardPrice) || 0);

                      return (
                        <React.Fragment key={pkg.id}>
                          <tr className={`transition-colors ${isExpanded ? "bg-amber-50/40" : "hover:bg-slate-50/70"}`}>
                            {/* Nome */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={pkg.name}
                                onChange={(e) => updatePackaging(idx, "name", e.target.value)}
                                placeholder="Ex: CAIXA PAPELAO 20X15X10"
                                className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full"
                              />
                            </td>

                            {/* Dimensões L x A x C */}
                            <td className="py-2.5 px-3">
                              <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700">
                                <span className="text-[10px] text-slate-400 font-bold pl-0.5">L:</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={pkg.width}
                                  onChange={(e) => updatePackaging(idx, "width", parseFloat(e.target.value) || 0)}
                                  className="w-10 bg-white border border-slate-200 rounded px-1 py-0.5 text-center font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                                  title="Largura (cm)"
                                />
                                <span className="text-slate-300">×</span>
                                <span className="text-[10px] text-slate-400 font-bold">A:</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={pkg.height}
                                  onChange={(e) => updatePackaging(idx, "height", parseFloat(e.target.value) || 0)}
                                  className="w-10 bg-white border border-slate-200 rounded px-1 py-0.5 text-center font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                                  title="Altura (cm)"
                                />
                                <span className="text-slate-300">×</span>
                                <span className="text-[10px] text-slate-400 font-bold">C:</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={pkg.length}
                                  onChange={(e) => updatePackaging(idx, "length", parseFloat(e.target.value) || 0)}
                                  className="w-10 bg-white border border-slate-200 rounded px-1 py-0.5 text-center font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                                  title="Comprimento (cm)"
                                />
                                <span className="text-[10px] text-slate-400 pr-0.5">cm</span>
                              </div>
                            </td>

                            {/* Valor Caixa */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1 font-bold text-slate-800">
                                <span className="text-[10px] text-slate-400">R$</span>
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0"
                                  value={pkg.boxPrice}
                                  onChange={(e) => updatePackaging(idx, "boxPrice", parseFloat(e.target.value) || 0)}
                                  className="w-16 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold focus:bg-white"
                                />
                              </div>
                            </td>

                            {/* Insumos & Proteção Inclusos */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px]">
                                  + R$ {protectionSum.toFixed(2)} fixos
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setExpandedPackagingId(isExpanded ? null : pkg.id)}
                                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                                  title="Ver e ajustar insumos e personalizados desta caixa"
                                >
                                  <SlidersHorizontal className="w-3 h-3" />
                                  <span>{isExpanded ? "Ocultar" : "Ajustar"}</span>
                                </button>
                              </div>
                            </td>

                            {/* Custo Total */}
                            <td className="py-2.5 px-3">
                              <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold font-mono text-xs border border-emerald-200 whitespace-nowrap shadow-2xs">
                                R$ {total.toFixed(2)}
                              </div>
                            </td>

                            {/* Ações */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setExpandedPackagingId(isExpanded ? null : pkg.id)}
                                  title="Ajustar insumos específicos desta caixa"
                                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                                    isExpanded ? "bg-amber-200 text-amber-900" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                                  }`}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => duplicatePackaging(pkg)}
                                  title="Duplicar embalagem"
                                  className="text-slate-400 hover:text-indigo-600 p-1.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removePackaging(pkg.id)}
                                  title="Excluir embalagem"
                                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Linha Expandida: Ajuste fino de Insumos & Personalizados desta Caixa */}
                          {isExpanded && (
                            <tr className="bg-amber-50/30">
                              <td colSpan={6} className="p-4 border-b border-amber-200/50">
                                <div className="p-4 bg-white border border-amber-200 rounded-xl space-y-3.5 shadow-xs">
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                                      <span className="text-xs font-bold text-slate-800">
                                        Personalização de Insumos para: <b>{pkg.name}</b>
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400">
                                      Você pode alterar os valores de proteção especificamente para esta caixa ou adicionar itens gravados.
                                    </span>
                                  </div>

                                  {/* Grid de Insumos Específicos desta Caixa */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                                      <span className="block text-[10px] text-slate-500 font-semibold mb-1">🫧 Plástico Bolha</span>
                                      <div className="flex items-center gap-1 font-bold text-slate-800">
                                        <span className="text-[10px] text-slate-400">R$</span>
                                        <input
                                          type="number"
                                          step="0.05"
                                          min="0"
                                          value={pkg.bubbleWrapPrice}
                                          onChange={(e) => updatePackaging(idx, "bubbleWrapPrice", parseFloat(e.target.value) || 0)}
                                          className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold"
                                        />
                                      </div>
                                    </div>

                                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                                      <span className="block text-[10px] text-slate-500 font-semibold mb-1">🏷️ Adesivo</span>
                                      <div className="flex items-center gap-1 font-bold text-slate-800">
                                        <span className="text-[10px] text-slate-400">R$</span>
                                        <input
                                          type="number"
                                          step="0.02"
                                          min="0"
                                          value={pkg.stickerPrice}
                                          onChange={(e) => updatePackaging(idx, "stickerPrice", parseFloat(e.target.value) || 0)}
                                          className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold"
                                        />
                                      </div>
                                    </div>

                                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                                      <span className="block text-[10px] text-slate-500 font-semibold mb-1">📜 Papel Seda</span>
                                      <div className="flex items-center gap-1 font-bold text-slate-800">
                                        <span className="text-[10px] text-slate-400">R$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={pkg.tissuePaperPrice}
                                          onChange={(e) => updatePackaging(idx, "tissuePaperPrice", parseFloat(e.target.value) || 0)}
                                          className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold"
                                        />
                                      </div>
                                    </div>

                                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                                      <span className="block text-[10px] text-amber-900 font-bold mb-1">💌 Cartão Agradecimento</span>
                                      <div className="flex items-center gap-1 font-bold text-amber-950">
                                        <span className="text-[10px] text-amber-600">R$</span>
                                        <input
                                          type="number"
                                          step="0.05"
                                          min="0"
                                          value={typeof pkg.thankYouCardPrice === "number" ? pkg.thankYouCardPrice : 0.50}
                                          onChange={(e) => updatePackaging(idx, "thankYouCardPrice", parseFloat(e.target.value) || 0)}
                                          className="w-full bg-white border border-amber-300 rounded px-1.5 py-0.5 text-xs font-bold text-amber-950"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Itens Personalizados Gravados Disponíveis */}
                                  {localCustomAddons.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100">
                                      <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                                        Itens Personalizados Gravados da Loja (clique para incluir nesta caixa):
                                      </span>
                                      <div className="flex flex-wrap gap-2">
                                        {localCustomAddons.map((addon) => {
                                          const isSelected = Array.isArray(pkg.customAddonIds) && pkg.customAddonIds.includes(addon.id);
                                          return (
                                            <button
                                              key={addon.id}
                                              type="button"
                                              onClick={() => togglePackagingAddon(idx, addon.id)}
                                              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                                isSelected
                                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                              }`}
                                            >
                                              <span>{isSelected ? "✓" : "+"}</span>
                                              <span>{addon.name}</span>
                                              <span className={isSelected ? "text-indigo-200" : "text-slate-400 font-normal"}>
                                                (R$ {addon.price.toFixed(2)})
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Personalizado Avulso Adicional desta Caixa */}
                                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                                      Outro Personalizado Avulso:
                                    </span>
                                    <input
                                      type="text"
                                      placeholder="Descrição (ex: Fita de Cetim Larga, Brinde Especial)"
                                      value={pkg.otherDescription || ""}
                                      onChange={(e) => updatePackaging(idx, "otherDescription", e.target.value)}
                                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <div className="flex items-center gap-1 font-bold text-slate-800">
                                      <span className="text-xs text-slate-400">R$</span>
                                      <input
                                        type="number"
                                        step="0.10"
                                        min="0"
                                        placeholder="0.00"
                                        value={pkg.otherPrice}
                                        onChange={(e) => updatePackaging(idx, "otherPrice", parseFloat(e.target.value) || 0)}
                                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:bg-white"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedPackagingId(null)}
                                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer self-end sm:self-auto"
                                    >
                                      Concluir
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={addPackaging}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer self-start"
              >
                <Plus className="w-4 h-4" /> Adicionar Outra Caixa
              </button>

              <div className="text-[11px] text-slate-400">
                Insumos fixos padrão somam <b>R$ {(standardBubble + standardSticker + standardTissue + standardCard).toFixed(2)}</b> (Bolha R$ {standardBubble.toFixed(2)} + Adesivo R$ {standardSticker.toFixed(2)} + Seda R$ {standardTissue.toFixed(2)} + Cartão R$ {standardCard.toFixed(2)})
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 2: PERSONALIZADOS GRAVADOS ================= */}
        {packagingActiveTab === "addons" && (
          <div className="space-y-4">
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/60 rounded-xl flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900">
                <p className="font-bold">Biblioteca de Itens Personalizados & Complementos</p>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Grave aqui os itens personalizados reutilizáveis da sua loja (como o <b>Cartão de Agradecimento</b>, fitas de cetim, tags com logomarca, mimos e brindes). Ao salvar alterações, esses itens ficam gravados no sistema.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[200px]">Nome do Item Personalizado</th>
                    <th className="py-2.5 px-3 w-36">Preço Unitário (R$)</th>
                    <th className="py-2.5 px-3">Descrição / Observações</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {localCustomAddons.map((addon, idx) => (
                    <tr key={addon.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={addon.name}
                          onChange={(e) => updateCustomAddon(idx, "name", e.target.value)}
                          placeholder="Ex: Cartão de Agradecimento"
                          className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 font-bold text-slate-800">
                          <span className="text-[10px] text-slate-400">R$</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={addon.price}
                            onChange={(e) => updateCustomAddon(idx, "price", parseFloat(e.target.value) || 0)}
                            className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-slate-900"
                          />
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={addon.description || ""}
                          onChange={(e) => updateCustomAddon(idx, "description", e.target.value)}
                          placeholder="Ex: Mensagem impressa em papel offset 180g"
                          className="text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-[11px] w-full"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeCustomAddon(addon.id)}
                          title="Remover item personalizado"
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                💡 Para incluir ou alterar itens, basta editar a tabela e clicar em <b>"Salvar Alterações"</b> no topo da página.
              </span>
              <button
                type="button"
                onClick={addCustomAddon}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Outro Item
              </button>
            </div>
          </div>
        )}

        <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[11px] text-amber-800 flex gap-2">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            <b>Como funciona no Fatiador 3D:</b> Na tela de precificação da peça, o campo <b>Embalagem</b> traz por padrão um seletor com as caixas cadastradas acima, calculando o custo total com precisão (incluindo caixa, bolha, adesivo, seda e o cartão de agradecimento). Caso deseje um valor avulso para um produto específico, basta alternar para a opção <b>Valor Personalizado</b>.
          </span>
        </div>
      </div>

    </div>
  );
};
