import React, { useState } from "react";
import { 
  Layers, 
  PlusCircle, 
  Settings, 
  FileSpreadsheet, 
  Calculator, 
  Zap, 
  Sparkles,
  Cloud,
  CloudOff,
  Loader2,
  Menu,
  X,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  LogOut
} from "lucide-react";
import { GlobalSettings } from "../types/pricing";
import { isSupabaseConfigured } from "../services/supabase";
import { TAB_ROUTES, TabType } from "../utils/routes";

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  settings: GlobalSettings;
  onNewProduct: () => void;
  onExportExcel: () => void;
  productsCount: number;
  isSyncing?: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onNewProduct,
  onExportExcel,
  productsCount,
  isSyncing = false,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white shadow-xs">
      {/* 1. BARRA SUPERIOR PRINCIPAL (Header de Navegação Executivo) */}
      <div className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            
            {/* Marca / Logo + Status Nuvem */}
            <div className="flex items-center gap-3">
              <a 
                href={TAB_ROUTES.catalog}
                className="flex items-center gap-2.5 cursor-pointer group no-underline" 
                onClick={(e) => { e.preventDefault(); setActiveTab("catalog"); setMobileMenuOpen(false); }}
              >
                <img 
                  src="/logo-artgian-cropped.png" 
                  alt="Artgian Studio" 
                  className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
                  onError={(e) => {
                    // Fallback se a imagem cropped não carregar
                    e.currentTarget.src = "/logo-artgian.png";
                  }}
                />
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-extrabold text-base text-slate-900 tracking-tight">Artgian</span>
                    <span className="text-xs font-semibold text-indigo-600">3D</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Precificação Studio</p>
                </div>
              </a>

              {/* Status de Nuvem Compacto (Supabase) */}
              <div className="ml-1 pl-3 border-l border-slate-200">
                {isSupabaseConfigured() ? (
                  <div 
                    title={isSyncing ? "Sincronizando dados com o Supabase..." : "Conectado ao Supabase (Sincronização em Nuvem Ativa)"}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium"
                  >
                    <span className="relative flex h-2 w-2">
                      {isSyncing && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="hidden sm:inline">
                      {isSyncing ? "Salvando..." : "Nuvem Ativa"}
                    </span>
                  </div>
                ) : (
                  <div 
                    title="Armazenamento local ativo"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span className="hidden sm:inline">Local</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navegação Central (Desktop) */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
              <a
                href={TAB_ROUTES.catalog}
                onClick={(e) => { e.preventDefault(); setActiveTab("catalog"); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "catalog"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Catálogo</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "catalog" 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "bg-slate-200/80 text-slate-600"
                }`}>
                  {productsCount}
                </span>
              </a>

              <a
                href={TAB_ROUTES.editor}
                onClick={(e) => { e.preventDefault(); setActiveTab("editor"); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "editor"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Fatiador 3D</span>
              </a>

              <a
                href={TAB_ROUTES.simulator}
                onClick={(e) => { e.preventDefault(); setActiveTab("simulator"); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "simulator"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Simulador de Margem</span>
              </a>

              <a
                href={TAB_ROUTES.settings}
                onClick={(e) => { e.preventDefault(); setActiveTab("settings"); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "settings"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Insumos & Taxas</span>
              </a>
            </nav>

            {/* Ações da Direita */}
            <div className="flex items-center gap-2">
              {/* Botão Primário: Novo Cálculo */}
              <button
                onClick={onNewProduct}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm rounded-lg transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Cálculo</span>
                <span className="sm:hidden">Novo</span>
              </button>

              {/* Perfil & Logout */}
              {onLogout && (
                <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200">
                  <div 
                    title="Conectado como Administrador (artgian)"
                    className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg text-slate-700 text-xs font-semibold"
                  >
                    <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                      A
                    </div>
                    <span className="text-[11px]">artgian</span>
                  </div>
                  <button
                    onClick={onLogout}
                    title="Sair do sistema (Logout)"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Botão Menu Mobile */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Abrir menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 2. BARRA SECUNDÁRIA (Submenu de Parâmetros de Produção & Ferramentas) */}
      <div className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between flex-wrap gap-y-1 gap-x-4">
          
          {/* Parâmetros Vigentes de Produção */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1 font-medium text-slate-400">
              <SlidersHorizontal className="w-3 h-3 text-slate-400" />
              <span>Base:</span>
            </span>

            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200/90 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Filamento: <strong className="text-slate-800">R$ {settings.defaultFilamentPricePerKg.toFixed(2)}/kg</strong></span>
            </div>

            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200/90 shadow-2xs">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Energia: <strong className="text-slate-800">R$ {settings.energyKwhPrice.toFixed(2)}/kWh</strong></span>
            </div>

            <div className="hidden lg:flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200/90 shadow-2xs">
              <span>Bambu Lab A1: <strong className="text-slate-800">{settings.defaultPrinterWatts}W</strong></span>
            </div>

            <a
              href={TAB_ROUTES.settings}
              onClick={(e) => { e.preventDefault(); setActiveTab("settings"); }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-0.5 transition-colors"
            >
              <span>Editar Taxas</span>
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>

          {/* Ferramentas e Ações Secundárias */}
          <div className="flex items-center gap-3">
            <button
              onClick={onExportExcel}
              title="Baixar planilha Excel (.xlsx) com catálogo completo e abas"
              className="flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. MENU MOBILE DESDOBRÁVEL */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1 shadow-md">
          <a
            href={TAB_ROUTES.catalog}
            onClick={(e) => { e.preventDefault(); setActiveTab("catalog"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${
              activeTab === "catalog" ? "bg-indigo-50 text-indigo-700" : "text-slate-600"
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>Catálogo de Produtos</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
              {productsCount}
            </span>
          </a>

          <a
            href={TAB_ROUTES.editor}
            onClick={(e) => { e.preventDefault(); setActiveTab("editor"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
              activeTab === "editor" ? "bg-indigo-50 text-indigo-700" : "text-slate-600"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Fatiador 3D & Novo Cálculo</span>
          </a>

          <a
            href={TAB_ROUTES.simulator}
            onClick={(e) => { e.preventDefault(); setActiveTab("simulator"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
              activeTab === "simulator" ? "bg-indigo-50 text-indigo-700" : "text-slate-600"
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Simulador de Margem Livre</span>
          </a>

          <a
            href={TAB_ROUTES.settings}
            onClick={(e) => { e.preventDefault(); setActiveTab("settings"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
              activeTab === "settings" ? "bg-indigo-50 text-indigo-700" : "text-slate-600"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Insumos, Impressoras & Taxas</span>
          </a>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              onClick={() => { onExportExcel(); setMobileMenuOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>

            {onLogout && (
              <button
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-600 bg-rose-50 rounded-lg font-medium hover:bg-rose-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

