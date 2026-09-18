import React, { useState } from "react";
import { 
  GlobalSettings, 
  Filament, 
  Printer, 
  MarketplaceConfig 
} from "../types/pricing";
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
  Layers
} from "lucide-react";

interface SettingsViewProps {
  settings: GlobalSettings;
  filaments: Filament[];
  printers: Printer[];
  onSaveSettings: (settings: GlobalSettings) => void;
  onSaveFilaments: (filaments: Filament[]) => void;
  onSavePrinters: (printers: Printer[]) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  filaments,
  printers,
  onSaveSettings,
  onSaveFilaments,
  onSavePrinters
}) => {
  const [localSettings, setLocalSettings] = useState<GlobalSettings>({ ...settings });
  const [localFilaments, setLocalFilaments] = useState<Filament[]>([...filaments]);
  const [localPrinters, setLocalPrinters] = useState<Printer[]>([...printers]);
  const [savedFeedback, setSavedFeedback] = useState(false);

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
  };

  const removeFilament = (id: string) => {
    setLocalFilaments(localFilaments.filter(f => f.id !== id));
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
  };

  const updatePrinter = (index: number, field: keyof Printer, val: any) => {
    const next = [...localPrinters];
    next[index] = { ...next[index], [field]: val };
    setLocalPrinters(next);
  };

  const removePrinter = (id: string) => {
    setLocalPrinters(localPrinters.filter(p => p.id !== id));
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
    onSaveSettings(localSettings);
    onSaveFilaments(localFilaments);
    onSavePrinters(localPrinters);
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
                <input
                  type="number"
                  step="0.01"
                  value={localSettings.energyKwhPrice}
                  onChange={(e) => setLocalSettings({ ...localSettings, energyKwhPrice: parseFloat(e.target.value) || 0 })}
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
                <input
                  type="number"
                  step="0.50"
                  value={localSettings.defaultFilamentPricePerKg}
                  onChange={(e) => setLocalSettings({ ...localSettings, defaultFilamentPricePerKg: parseFloat(e.target.value) || 0 })}
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
                <input
                  type="number"
                  step="5"
                  value={localSettings.defaultPrinterWatts}
                  onChange={(e) => setLocalSettings({ ...localSettings, defaultPrinterWatts: parseInt(e.target.value, 10) || 0 })}
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
                <input
                  type="number"
                  step="1"
                  value={localSettings.defaultVariableCostPercent}
                  onChange={(e) => setLocalSettings({ ...localSettings, defaultVariableCostPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 pr-8 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Percentual aplicado sobre o subtotal para cobrir falhas e descartes (padrão: 10%)</p>
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
                      <input
                        type="number"
                        step="0.5"
                        value={mp.commissionPercent}
                        onChange={(e) => updateMarketplace(mp.id, "commissionPercent", parseFloat(e.target.value) || 0)}
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
                      <input
                        type="number"
                        step="0.5"
                        value={mp.fixedFee}
                        onChange={(e) => updateMarketplace(mp.id, "fixedFee", parseFloat(e.target.value) || 0)}
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

    </div>
  );
};
