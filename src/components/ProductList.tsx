import React, { useState } from "react";
import { 
  ProductItem, 
  GlobalSettings, 
  Filament, 
  Printer 
} from "../types/pricing";
import { calculatePricing, AVAILABLE_MARGIN_OPTIONS } from "../utils/calculator";
import { 
  Search, 
  Plus, 
  Clock, 
  Scale, 
  Tag, 
  Edit3, 
  Copy, 
  Trash2, 
  Layers, 
  DollarSign, 
  ShoppingBag, 
  Share2, 
  Sparkles,
  ArrowUpDown,
  FileSpreadsheet
} from "lucide-react";

interface ProductListProps {
  products: ProductItem[];
  settings: GlobalSettings;
  filaments: Filament[];
  printers: Printer[];
  onEditProduct: (product: ProductItem) => void;
  onDuplicateProduct: (product: ProductItem) => void;
  onDeleteProduct: (productId: string) => void;
  onNewProduct: () => void;
  onOpenQuote: (product: ProductItem, selectedMargin?: number) => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  settings,
  filaments,
  printers,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
  onNewProduct,
  onOpenQuote
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMargin, setSelectedMargin] = useState<number>(1.0); // 100% padrão
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Categorias únicas
  const categories = ["all", ...Array.from(new Set(products.map(p => p.category || "Geral")))];

  // Filtro e Busca
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.notes || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || (p.category || "Geral") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Métricas rápidas
  const totalWeight = products.reduce((acc, p) => {
    const res = calculatePricing(p, settings, filaments, printers);
    return acc + res.totalGrams;
  }, 0);

  const avgCost = products.length > 0
    ? products.reduce((acc, p) => acc + calculatePricing(p, settings, filaments, printers).totalCost, 0) / products.length
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Produtos Cadastrados</p>
            <p className="text-xl font-bold text-slate-800">{products.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Custo Médio de Produção</p>
            <p className="text-xl font-bold text-slate-800">R$ {avgCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Consumo Total de Filamento</p>
            <p className="text-xl font-bold text-slate-800">{totalWeight.toFixed(0)} g <span className="text-xs font-normal text-slate-400">({(totalWeight/1000).toFixed(2)} kg)</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Taxa Shopee Atual</p>
            <p className="text-xl font-bold text-slate-800">{settings.marketplaces.find(m => m.id === "shopee")?.commissionPercent || 20}% + R$ 4</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Category, Margin Selector & New Button */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, notas ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "all" ? "Todas Categorias" : cat}
            </button>
          ))}
        </div>

        {/* Margin Preview Selector */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Margem Visualizada:</span>
          <select
            value={selectedMargin.toString()}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (!isNaN(val)) setSelectedMargin(val);
            }}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {AVAILABLE_MARGIN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value.toString()}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Nenhum produto encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchTerm ? "Tente alterar os termos de busca ou categoria." : "Cadastre seu primeiro produto manualmente ou importe dados do seu fatiador 3D."}
          </p>
          <button
            onClick={onNewProduct}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Criar Novo Produto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map(product => {
            const pricing = calculatePricing(product, settings, filaments, printers);
            const numMargin = Number(selectedMargin);
            const marginRow = pricing.margins.find(m => Math.abs(m.marginPercent - numMargin) < 0.005)
              || pricing.margins.find(m => Math.abs(m.marginPercent - 1.0) < 0.005)
              || pricing.margins[0];
            const shopee = marginRow?.marketplacePrices["shopee"];

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {product.category || "Geral"}
                        </span>
                        {product.quantityInBatch > 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            Lote: {product.quantityInBatch} un
                          </span>
                        )}
                        {product.isMultiPart && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                            {product.parts.length} Peças
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onOpenQuote(product, selectedMargin)}
                        title="Gerar Orçamento / Ficha Técnica"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDuplicateProduct(product)}
                        title="Duplicar Produto"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded-md"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditProduct(product)}
                        title="Editar / Ver Tabela Completa"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(product.id)}
                        title="Excluir"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Production specs */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-slate-400" />
                      <b>{pricing.totalGrams} g</b>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <b>{pricing.totalTimeString}</b>
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">
                      Filamento: R$ {pricing.filamentCost.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Cost & Price Comparison */}
                <div className="p-4 bg-slate-50/70 flex flex-col gap-3">
                  
                  {/* Cost breakdown pill */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">Custo de Produção</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-slate-800">
                          R$ {pricing.totalCost.toFixed(2)}
                        </span>
                        {product.quantityInBatch > 1 && (
                          <span className="text-xs font-semibold text-indigo-600">
                            (R$ {pricing.unitCost.toFixed(2)}/un)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400">
                      <span>Energia: R$ {pricing.energyCost.toFixed(2)}</span>
                      <br />
                      <span>Embalagem: R$ {(pricing.packagingCost + pricing.accessoriesCost).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Prices for selected margin */}
                  <div className="grid grid-cols-2 gap-2">
                    
                    {/* Direct Sale */}
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Venda Direta ({marginRow.marginLabel})
                      </span>
                      <div className="text-base font-black text-emerald-700 mt-0.5">
                        R$ {marginRow.directSalePrice.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold">
                        Lucro: +R$ {marginRow.directProfit.toFixed(2)}
                      </div>
                      {product.quantityInBatch > 1 && (
                        <div className="text-[10px] text-emerald-700/80 font-medium">
                          R$ {marginRow.directUnitSalePrice.toFixed(2)}/un
                        </div>
                      )}
                    </div>

                    {/* Shopee Sale */}
                    <div className="bg-orange-50/60 border border-orange-100 rounded-lg p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">
                          Shopee ({marginRow.marginLabel})
                        </span>
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      </div>
                      <div className="text-base font-black text-orange-700 mt-0.5">
                        R$ {shopee?.salePrice.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-orange-600 font-semibold">
                        Líquido: +R$ {shopee?.netProfit.toFixed(2)}
                      </div>
                      {product.quantityInBatch > 1 && (
                        <div className="text-[10px] text-orange-700/80 font-medium">
                          R$ {shopee?.unitSalePrice.toFixed(2)}/un
                        </div>
                      )}
                    </div>

                  </div>

                </div>

                {/* Footer button */}
                <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] flex items-center gap-1">
                    <span className="text-slate-400">Perda/Var:</span>
                    {pricing.isCustomVariableCost ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-bold text-[10px]" title="Margem de falha personalizada para este produto">
                        {pricing.variableCostPercent}% (Personalizada)
                      </span>
                    ) : (
                      <span className="text-slate-600 font-semibold" title="Margem padrão do sistema">
                        {pricing.variableCostPercent}% (Padrão)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onEditProduct(product)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
                  >
                    Ver Tabela Completa →
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
