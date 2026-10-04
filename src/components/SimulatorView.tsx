import React, { useMemo, useState } from "react";
import { 
  ProductItem, 
  GlobalSettings, 
  Filament, 
  Printer,
  PackagingItem,
  CustomPackagingAddon
} from "../types/pricing";
import {
  calculatePricing,
  simulateCustomSalePrice,
  calculateRequiredSalePrice,
  describeMarketplaceFees,
  formatBRL,
  formatNumber,
  formatPercent
} from "../utils/calculator";
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
  packagings?: PackagingItem[];
  customAddons?: CustomPackagingAddon[];
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  products,
  settings,
  filaments,
  printers,
  packagings = [],
  customAddons = []
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [targetSalePrice, setTargetSalePrice] = useState<string>("45,00");
  const [targetDesiredProfit, setTargetDesiredProfit] = useState<string>("20,00");
  const [activeMode, setActiveMode] = useState<"byPrice" | "byProfit">("byPrice");
  const [isUnitPrice, setIsUnitPrice] = useState<boolean>(false);

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  const pricing = useMemo(
    () => selectedProduct
      ? calculatePricing(selectedProduct, settings, filaments, printers, packagings, customAddons)
      : null,
    [selectedProduct, settings, filaments, printers, packagings, customAddons]
  );

  const baseCost = pricing
    ? (isUnitPrice && selectedProduct.quantityInBatch > 1 ? pricing.unitCost : pricing.totalCost)
    : 0;

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
  // Marketplaces: mesma recomposição da tabela de margens (comissão, taxa fixa, teto e faixa mínima)
  const reqShopeePrice = calculateRequiredSalePrice(reqDirectPrice, shopeeConfig);
  const reqMLPrice = calculateRequiredSalePrice(reqDirectPrice, mlConfig);

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-2">
        <Calculator className="w-8 h-8 text-indigo-500 mx-auto" aria-hidden="true" />
        <h2 className="text-base font-bold text-slate-800">Nenhum produto para simular</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Cadastre um produto no Fatiador 3D para comparar lucro e preços na venda direta e nos marketplaces.
        </p>
      </div>
    );
  }

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
          <label htmlFor="simulator-product" className="text-xs font-semibold text-slate-600 whitespace-nowrap">Produto:</label>
          <select
            id="simulator-product"
            value={selectedProduct?.id || ""}
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
                Peso: <b>{formatNumber(pricing.totalGrams)}g</b> • Tempo: <b>{pricing.totalTimeString}</b> • Subtotal: {formatBRL(pricing.subtotal)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-indigo-200/60 pt-2 sm:pt-0 sm:pl-4">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Custo Total (Lote)</span>
              <span className="font-black text-slate-800 text-sm">{formatBRL(pricing.totalCost)}</span>
            </div>

            {selectedProduct.quantityInBatch > 1 && (
              <>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Custo Unitário</span>
                  <span className="font-black text-indigo-700 text-sm">{formatBRL(pricing.unitCost)}</span>
                </div>

                <div className="flex bg-white rounded-lg border border-indigo-200 p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    aria-pressed={!isUnitPrice}
                    onClick={() => setIsUnitPrice(false)}
                    className={`px-2.5 py-1 rounded ${!isUnitPrice ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                  >
                    Simular Lote
                  </button>
                  <button
                    type="button"
                    aria-pressed={isUnitPrice}
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
      <div className="flex border-b border-slate-200 overflow-x-auto" role="tablist" aria-label="Modo de simulação">
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "byPrice"}
          onClick={() => setActiveMode("byPrice")}
          className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeMode === "byPrice"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <DollarSign className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="sm:hidden">Por preço de venda</span>
          <span className="hidden sm:inline">Modo 1: "Se eu vender por R$ X, quanto sobra?"</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "byProfit"}
          onClick={() => setActiveMode("byProfit")}
          className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeMode === "byProfit"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Target className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="sm:hidden">Por lucro desejado</span>
          <span className="hidden sm:inline">Modo 2: "Quero lucrar R$ Y limpo, por quanto devo vender?"</span>
        </button>
      </div>

      {/* Content Mode 1: Venda por Preço Arbitrário */}
      {activeMode === "byPrice" && (
        <div className="space-y-6">
          
          {/* Input Preço */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <label htmlFor="simulator-sale-price" className="block text-xs font-bold text-slate-800">
                Digite o Preço de Venda a ser testado:
              </label>
              <p className="text-[11px] text-slate-400">
                Custo base considerado: <b>{formatBRL(baseCost)}</b> ({isUnitPrice ? "por unidade" : "lote completo"})
              </p>
            </div>

            <div className="relative w-full sm:w-60">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">R$</span>
              <input
                id="simulator-sale-price"
                type="text"
                inputMode="decimal"
                value={targetSalePrice}
                onChange={(e) => setTargetSalePrice(e.target.value)}
                placeholder="0,00"
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
                    {formatBRL(simDirect.netProfit)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 mt-1 inline-block">
                    Markup: {formatPercent(simDirect.markupPercent)} sobre custo
                  </span>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Preço de Venda:</span>
                    <span className="font-bold text-slate-800">{formatBRL(numSalePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxas e Comissões:</span>
                    <span className="font-semibold text-emerald-600">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custo do Produto:</span>
                    <span className="font-semibold text-slate-600">-{formatBRL(baseCost)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                    <span>Margem sobre a Venda:</span>
                    <span className="text-emerald-700">{formatPercent(simDirect.marginPercent)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shopee */}
            <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-4 bg-orange-50/60 border-b border-orange-100 flex items-center justify-between">
                <span className="font-bold text-xs text-orange-950 uppercase tracking-wider">{shopeeConfig.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  {describeMarketplaceFees(shopeeConfig)}
                </span>
              </div>

              <div className="p-5 space-y-3">
                <div className="text-center py-2">
                  <span className="text-xs text-slate-400 font-semibold block">Lucro Líquido no Bolso</span>
                  <span className={`text-3xl font-black block ${simShopee.netProfit >= 0 ? "text-orange-600" : "text-rose-600"}`}>
                    {formatBRL(simShopee.netProfit)}
                  </span>
                  <span className="text-xs font-bold text-orange-700 mt-1 inline-block">
                    Markup: {formatPercent(simShopee.markupPercent)} sobre custo
                  </span>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Preço de Venda:</span>
                    <span className="font-bold text-slate-800">{formatBRL(numSalePrice)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Taxa {shopeeConfig.name}:</span>
                    <span className="font-bold">-{formatBRL(simShopee.fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Você recebe do canal:</span>
                    <span className="font-bold text-slate-800">{formatBRL(simShopee.netReceived)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custo do Produto:</span>
                    <span className="font-semibold text-slate-600">-{formatBRL(baseCost)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                    <span>Margem sobre a Venda:</span>
                    <span className="text-orange-700">{formatPercent(simShopee.marginPercent)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mercado Livre */}
            <div className="bg-white rounded-xl border border-yellow-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-4 bg-yellow-50/50 border-b border-yellow-100 flex items-center justify-between">
                <span className="font-bold text-xs text-yellow-950 uppercase tracking-wider">{mlConfig.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                  {describeMarketplaceFees(mlConfig)}
                </span>
              </div>

              <div className="p-5 space-y-3">
                <div className="text-center py-2">
                  <span className="text-xs text-slate-400 font-semibold block">Lucro Líquido no Bolso</span>
                  <span className={`text-3xl font-black block ${simML.netProfit >= 0 ? "text-amber-600" : "text-rose-600"}`}>
                    {formatBRL(simML.netProfit)}
                  </span>
                  <span className="text-xs font-bold text-amber-700 mt-1 inline-block">
                    Markup: {formatPercent(simML.markupPercent)} sobre custo
                  </span>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Preço de Venda:</span>
                    <span className="font-bold text-slate-800">{formatBRL(numSalePrice)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Taxa {mlConfig.name}:</span>
                    <span className="font-bold">-{formatBRL(simML.fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Você recebe do canal:</span>
                    <span className="font-bold text-slate-800">{formatBRL(simML.netReceived)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custo do Produto:</span>
                    <span className="font-semibold text-slate-600">-{formatBRL(baseCost)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                    <span>Margem sobre a Venda:</span>
                    <span className="text-amber-700">{formatPercent(simML.marginPercent)}</span>
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
              <label htmlFor="simulator-desired-profit" className="block text-xs font-bold text-slate-800">
                Quanto de Lucro Líquido (R$) você quer colocar no bolso por cada venda?
              </label>
              <p className="text-[11px] text-slate-400">
                O sistema calculará por quanto você deve anunciar em cada plataforma para sobrar exatamente esse valor.
              </p>
            </div>

            <div className="relative w-full sm:w-60">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-500">R$</span>
              <input
                id="simulator-desired-profit"
                type="text"
                inputMode="decimal"
                value={targetDesiredProfit}
                onChange={(e) => setTargetDesiredProfit(e.target.value)}
                placeholder="0,00"
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
                <p className="text-3xl font-black text-emerald-700">{formatBRL(reqDirectPrice)}</p>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                Custo de {formatBRL(baseCost)} + Lucro de {formatBRL(numDesiredProfit)}
              </p>
            </div>

            {/* Shopee Requerida */}
            <div className="bg-white rounded-xl border border-orange-200 p-5 shadow-sm space-y-3">
              <span className="text-xs font-bold text-orange-950 uppercase tracking-wider block">
                Preço Necessário: {shopeeConfig.name}
              </span>
              <div>
                <span className="text-xs text-slate-400 font-medium">Anunciar por:</span>
                <p className="text-3xl font-black text-orange-700">{formatBRL(reqShopeePrice)}</p>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                {shopeeConfig.name} retém {formatBRL(reqShopeePrice - reqDirectPrice)} em taxas, e sobram exatamente <b>{formatBRL(numDesiredProfit)}</b> para você.
              </p>
            </div>

            {/* ML Requerido */}
            <div className="bg-white rounded-xl border border-yellow-200 p-5 shadow-sm space-y-3">
              <span className="text-xs font-bold text-yellow-950 uppercase tracking-wider block">
                Preço Necessário: {mlConfig.name}
              </span>
              <div>
                <span className="text-xs text-slate-400 font-medium">Anunciar por:</span>
                <p className="text-3xl font-black text-amber-700">{formatBRL(reqMLPrice)}</p>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                {mlConfig.name} retém {formatBRL(reqMLPrice - reqDirectPrice)} em taxas, e sobram exatamente <b>{formatBRL(numDesiredProfit)}</b> para você.
              </p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
