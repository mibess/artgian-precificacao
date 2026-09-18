import React from "react";
import { 
  Printer, 
  Layers, 
  PlusCircle, 
  Settings, 
  FileSpreadsheet, 
  Calculator, 
  Zap, 
  Sparkles,
  RotateCcw
} from "lucide-react";
import { GlobalSettings } from "../types/pricing";

interface NavbarProps {
  activeTab: "catalog" | "editor" | "simulator" | "settings";
  setActiveTab: (tab: "catalog" | "editor" | "simulator" | "settings") => void;
  settings: GlobalSettings;
  onNewProduct: () => void;
  onExportExcel: () => void;
  onResetDefaults: () => void;
  productsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onNewProduct,
  onExportExcel,
  onResetDefaults,
  productsCount
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("catalog")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">3DPrice</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">PRO</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Precificação Inteligente 3D</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "catalog"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4" />
              Catálogo ({productsCount})
            </button>

            <button
              onClick={() => setActiveTab("editor")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "editor"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Novo Produto / Fatiador
            </button>

            <button
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "simulator"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calculator className="w-4 h-4" />
              Simulador de Margem
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "settings"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Settings className="w-4 h-4" />
              Insumos & Taxas
            </button>
          </nav>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Rates pill */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Filamento: <b>R$ {settings.defaultFilamentPricePerKg.toFixed(2)}/kg</b>
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 font-medium">
                <Zap className="w-3 h-3 text-amber-500" />
                Energia: <b>R$ {settings.energyKwhPrice.toFixed(2)}/kWh</b>
              </span>
            </div>

            {/* Export Excel */}
            <button
              onClick={onExportExcel}
              title="Baixar planilha Excel (.xlsx) com abas e catálogo"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>

            {/* Novo Produto */}
            <button
              onClick={onNewProduct}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm rounded-lg transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Cálculo</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
