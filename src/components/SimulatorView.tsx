import React, { useState } from "react";
import { 
  ProductItem, 
  GlobalSettings, 
  Filament, 
  Printer 
} from "../types/pricing";
import { calculatePricing, simulateCustomSalePrice } from "../utils/calculator";
import { 
  Calculator, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Target, 
  Percent, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Info
} from "lucide-react";

interface SimulatorViewProps {
  products: ProductItem[];
  settings: GlobalSettings;
  filaments: Filament[];
  printers: Printer[];
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  products,
  settings,
  filaments,
  printers
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [targetSalePrice, setTargetSalePrice] = useState<string>("45.00");
  const [targetDesiredProfit, setTargetDesiredProfit] = useState<string>("20.00");
  const [activeMode, setActiveMode] = useState<"byPrice" | "byProfit">("byPrice");
  const [isUnitPrice, setIsUnitPrice] = useState<boolean>(false);

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  const pricing = selectedProduct
    ? calculatePricing(selectedProduct, settings, filaments, printers)
    : null;

  const baseCost = pricing
    ? (isUnitPrice && selectedProduct.quantityInBatch > 1 ? pricing.unitCost : pricing.totalCost)
    : 10.0;

  const numSalePrice = parseFloat(targetSalePrice.replace(",", ".")) || 0;
  const numDesiredProfit = parseFloat(targetDesiredProfit.replace(",", ".")) || 0;

  // Canais
  const shopeeConfig = settings.marketplaces.find(m => m.id === "shopee") || {
    id: "shopee",
    name: "Shopee",
    commissionPercent: 20,
    fixedFee: 4.0,
    enabled: true,
    colorBadge: ""
  };

  const mlConfig = settings.marketplaces.find(m => m.id === "ml_classico") || {
    id: "ml_classico",
    name: "Mercado Livre",
    commissionPercent: 14,
    fixedFee: 6.0,
    enabled: true,
    colorBadge: ""
  };

  // Simulações Modo 1: Preço digitado
  const simDirect = simulateCustomSalePrice(numSalePrice, baseCost);
  const simShopee = simulateCustomSalePrice(numSalePrice, baseCost, shopeeConfig);
  const simML = simulateCustomSalePrice(numSalePrice, baseCost, mlConfig);

  // Simulações Modo 2: Lucro desejado -> Preço necessário
  // Preço direto = Custo + Lucro
  const reqDirectPrice = baseCost + numDesiredProfit;
  // Preço Shopee = (Custo + Lucro + Taxa Fixa) / (1 - comissão)
  const reqShopeePrice = (baseCost + numDesiredProfit + shopeeConfig.fixedFee) / (1 - shopeeConfig.commissionPercent / 100);
  const reqMLPrice = (baseCost + numDesiredProfit + mlConfig.fixedFee) / (1 - mlConfig.commissionPercent / 100);

  return (
    <div className="w-full space-y-6 pb-16">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            Simulador Avançado de Precificação & Margens
          </h2>
          <p className="text-xs text-slate-500">
            Analise a lucratividade real nos diferentes canais de venda (Venda Direta, Shopee, Mercado Livre).
          </p>
        </div>

        {/* Seletor de Produto */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Produto:</span>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-indigo-500 w-full md:w-64"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.quantityInBatch > 1 ? `(Lote ${p.quantityInBatch}un)` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Produto Selecionado Info */}
      {selectedProduct && pricing && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">{selectedProduct.name}</p>
              <p className="text-slate-500">
                Peso: <b>{pricing.totalGrams}g</b> • Tempo: <b>{pricing.totalTimeString}</b> • Subtotal: R$ {pricing.subtotal.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-indigo-200/60 pt-2 sm:pt-0 sm:pl-4">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Custo Total (Lote)</span>
              <span className="font-black text-slate-800 text-sm">R$ {pricing.totalCost.toFixed(2)}</span>
            </div>

            {selectedProduct.quantityInBatch > 1 && (
              <>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Custo Unitário</span>
                  <span className="font-black text-indigo-700 text-sm">R$ {pricing.unitCost.toFixed(2)}</span>
                </div>

                <div className="flex bg-white rounded-lg border border-indigo-200 p-0.5 text-[11px] font-semibold">
                  <button
                    onClick={() => setIsUnitPrice(false)}
                    className={`px-2.5 py-1 rounded ${!isUnitPrice ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                  >
                    Simular Lote
                  </button>
                  <button
                    onClick={() => setIsUnitPrice(true)}
                    className={`px-2.5 py-1 rounded ${isUnitPrice ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                  >
                    Simular Unitário
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveMode("byPrice")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeMode === "byPrice"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Modo 1: "Se eu vender por R$ X, quanto sobra?"
        </button>

        <button
          onClick={() => setActiveMode("byProfit")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeMode === "byProfit"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Target className="w-4 h-4" />
          Modo 2: "Quero lucrar R$ Y limpo, por quanto devo vender?"
        </button>
      </div>

      {/* Content Mode 1: Venda por Preço Arbitrário */}
      {activeMode === "byPrice" && (
        <div className="space-y-6">
          
          {/* Input Preço */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Digite o Preço de Venda a ser testado:
              </label>
              <p className="text-[11px] text-slate-400">
                Custo base considerado: <b>R$ {baseCost.toFixed(2)}</b> ({isUnitPrice ? "por unidade" : "lote completo"})
              </p>
            </div>

            <div className="relative w-full sm:w-60">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">R$</span>
              <input
                type="text"
                value={targetSalePrice}
                onChange={(e) => setTargetSalePrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2.5 text-lg font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-right"
              />
            </div>
          </div>

          {/* Cards de Comparação Lado a Lado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Venda Direta */}
            <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-900 uppercase tracking-wider">Venda Direta / WhatsApp</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Sem Taxas</span>
              </div>

              <div className="p-5 space-y-3">
                <div className="text-center py-2">
                  <span className="text-xs text-slate-400 font-semibold block">Lucro Líquido no Bolso</span>
                  <span className={`text-3xl font-black block ${simDirect.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    R$ {simDirect.netProfit.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 mt-1 inline-block">
                    Margem: {simDirect.marginPercent.toFixed(1)}% sobre custo
                  </span>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Preço de Venda:</span>
                    <span className="font-bold text-slate-800">R$ {numSalePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxas e Comissões:</span>
                    <span className="font-semibold text-emerald-600">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custo do Produto:</span>
                    <span className="font-semibold text-slate-600">-R$ {baseCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                    <span>Margem Operacional (ROI):</span>
                    <span>{simDirect.roi.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shopee */}
            <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-4 bg-orange-50/60 border-b border-orange-100 flex items-center justify-between">
                <span className="font-bold text-xs text-orange-950 uppercase tracking-wider">Shopee</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  {shopeeConfig.commissionPercent}% + R$ {shopeeConfig.fixedFee.toFixed(2)}
                </span>
              </div>

              <div className="p-5 space-y-3">
                <div className="text-center py-2">
                  <span className="text-xs text-slate-400 font-semibold block">Lucro Líquido no Bolso</span>
                  <span className={`text-3xl font-black block ${simShopee.netProfit >= 0 ? "text-orange-600" : "text-rose-600"}`}>
                    R$ {simShopee.netProfit.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-orange-700 mt-1 inline-block">
                    Margem: {simShopee.marginPercent.toFixed(1)}% sobre custo
                  </span>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Preço de Venda:</span>
                    <span className="font-bold text-slate-800">R$ {numSalePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Taxa Shopee:</span>
                    <span className="font-bold">-R$ {simShopee.fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Você recebe da Shopee:</span>
                    <span className="font-bold text-slate-800">R$ {simShopee.netReceived.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custo do Produto:</span>
                    <span className="font-semibold text-slate-600">-R$ {baseCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mercado Livre */}
            <div className="bg-white rounded-xl border border-yellow-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-4 bg-yellow-50/50 border-b border-yellow-100 flex items-center justify-between">
                <span className="font-bold text-xs text-yellow-950 uppercase tracking-wider">Mercado Livre</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                  {mlConfig.commissionPercent}% + R$ {mlConfig.fixedFee.toFixed(2)}
                </span>
              </div>

              <div className="p-5 space-y-3">
                <div className="text-center py-2">
                  <span className="text-xs text-slate-400 font-semibold block">Lucro Líquido no Bolso</span>
                  <span className={`text-3xl font-black block ${simML.netProfit >= 0 ? "text-amber-600" : "text-rose-600"}`}>
                    R$ {simML.netProfit.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-amber-700 mt-1 inline-block">
                    Margem: {simML.marginPercent.toFixed(1)}% sobre custo
                  </span>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Preço de Venda:</span>
                    <span className="font-bold text-slate-800">R$ {numSalePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Taxa Mercado Livre:</span>
                    <span className="font-bold">-R$ {simML.fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Você recebe do ML:</span>
                    <span className="font-bold text-slate-800">R$ {simML.netReceived.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custo do Produto:</span>
                    <span className="font-semibold text-slate-600">-R$ {baseCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Content Mode 2: Meta de Lucro Desejado */}
      {activeMode === "byProfit" && (
        <div className="space-y-6">
          
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Quanto de Lucro Líquido (R$) você quer colocar no bolso por cada venda?
              </label>
              <p className="text-[11px] text-slate-400">
                O sistema calculará por quanto você deve anunciar em cada plataforma para sobrar exatamente esse valor.
              </p>
            </div>

            <div className="relative w-full sm:w-60">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-500">R$</span>
              <input
                type="text"
                value={targetDesiredProfit}
                onChange={(e) => setTargetDesiredProfit(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2.5 text-lg font-black text-slate-900 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Venda Direta Requerida */}
            <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm space-y-3">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                Preço no Balcão / WhatsApp
              </span>
              <div>
                <span className="text-xs text-slate-400 font-medium">Anunciar por:</span>
                <p className="text-3xl font-black text-emerald-700">R$ {reqDirectPrice.toFixed(2)}</p>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                Custo de R$ {baseCost.toFixed(2)} + Lucro de R$ {numDesiredProfit.toFixed(2)}
              </p>
            </div>

            {/* Shopee Requerida */}
            <div className="bg-white rounded-xl border border-orange-200 p-5 shadow-sm space-y-3">
              <span className="text-xs font-bold text-orange-950 uppercase tracking-wider block">
                Preço Necessário na Shopee
              </span>
              <div>
                <span className="text-xs text-slate-400 font-medium">Anunciar por:</span>
                <p className="text-3xl font-black text-orange-700">R$ {reqShopeePrice.toFixed(2)}</p>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                Shopee retém R$ {(reqShopeePrice - baseCost - numDesiredProfit).toFixed(2)} de comissão, e sobram exatamente <b>R$ {numDesiredProfit.toFixed(2)}</b> para você.
              </p>
            </div>

            {/* ML Requerido */}
            <div className="bg-white rounded-xl border border-yellow-200 p-5 shadow-sm space-y-3">
              <span className="text-xs font-bold text-yellow-950 uppercase tracking-wider block">
                Preço no Mercado Livre
              </span>
              <div>
                <span className="text-xs text-slate-400 font-medium">Anunciar por:</span>
                <p className="text-3xl font-black text-amber-700">R$ {reqMLPrice.toFixed(2)}</p>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                ML retém R$ {(reqMLPrice - baseCost - numDesiredProfit).toFixed(2)} de comissão, e sobram exatamente <b>R$ {numDesiredProfit.toFixed(2)}</b> para você.
              </p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
