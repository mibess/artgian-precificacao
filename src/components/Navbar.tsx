import React, { useEffect, useState } from "react";
import {
  Layers,
  PlusCircle,
  Settings,
  FileSpreadsheet,
  Calculator,
  Zap,
  Sparkles,
  Menu,
  X,
  SlidersHorizontal,
  ChevronRight,
  LogOut,
  CloudOff
} from "lucide-react";
import { GlobalSettings } from "../types/pricing";
import { formatBRL } from "../utils/calculator";
import { IS_DEV } from "../config/env";
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
  userEmail?: string;
}

interface NavItem {
  tab: TabType;
  label: string;
  mobileLabel: string;
  icon: React.ReactNode;
  mobileIcon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    tab: "catalog",
    label: "Catálogo",
    mobileLabel: "Catálogo de Produtos",
    icon: <Layers className="w-3.5 h-3.5" aria-hidden="true" />,
    mobileIcon: <Layers className="w-4 h-4" aria-hidden="true" />
  },
  {
    tab: "editor",
    label: "Fatiador 3D",
    mobileLabel: "Fatiador 3D & Novo Cálculo",
    icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />,
    mobileIcon: <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
  },
  {
    tab: "simulator",
    label: "Simulador de Margem",
    mobileLabel: "Simulador de Margem Livre",
    icon: <Calculator className="w-3.5 h-3.5" aria-hidden="true" />,
    mobileIcon: <Calculator className="w-4 h-4" aria-hidden="true" />
  },
  {
    tab: "settings",
    label: "Insumos & Taxas",
    mobileLabel: "Insumos, Impressoras & Taxas",
    icon: <Settings className="w-3.5 h-3.5" aria-hidden="true" />,
    mobileIcon: <Settings className="w-4 h-4" aria-hidden="true" />
  }
];

/** Acompanha a conectividade do navegador para avisar quando os salvamentos não chegarão à nuvem. */
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onNewProduct,
  onExportExcel,
  productsCount,
  isSyncing = false,
  onLogout,
  userEmail
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isOnline = useOnlineStatus();
  const userInitial = (userEmail || "?").trim().charAt(0).toUpperCase();

  const goTo = (tab: TabType) => (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white shadow-xs no-print">
      {/* 1. BARRA SUPERIOR PRINCIPAL (Header de Navegação Executivo) */}
      <div className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-2">

            {/* Marca / Logo + Status Nuvem */}
            <div className="flex items-center gap-3 min-w-0">
              <a
                href={TAB_ROUTES.catalog}
                className="flex items-center gap-2.5 cursor-pointer group no-underline rounded-lg"
                onClick={goTo("catalog")}
                aria-label="Artgian Precificação - ir para o catálogo"
              >
                <img
                  src="/logo-artgian-cropped.png"
                  alt=""
                  width={32}
                  height={32}
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
              <div className="ml-1 pl-3 border-l border-slate-200 flex items-center gap-2">
                {isOnline ? (
                  <div
                    title={isSyncing ? "Sincronizando dados com o Supabase..." : "Conectado ao Supabase"}
                    role="status"
                    aria-live="polite"
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium"
                  >
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                      {isSyncing && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="hidden sm:inline">
                      {isSyncing ? "Salvando..." : "Nuvem Ativa"}
                    </span>
                    <span className="sr-only sm:hidden">{isSyncing ? "Salvando" : "Nuvem ativa"}</span>
                  </div>
                ) : (
                  <div
                    title="Sem conexão com a internet: alterações não serão salvas até a conexão voltar"
                    role="status"
                    aria-live="polite"
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold"
                  >
                    <CloudOff className="w-3 h-3" aria-hidden="true" />
                    <span className="hidden sm:inline">Offline</span>
                    <span className="sr-only sm:hidden">Offline</span>
                  </div>
                )}
                {IS_DEV && (
                  <span
                    title="Você está usando o banco de DESENVOLVIMENTO"
                    className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-extrabold tracking-wide"
                  >
                    DEV
                  </span>
                )}
              </div>

            </div>

            {/* Navegação Central (Desktop) */}
            <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
              {NAV_ITEMS.map(item => {
                const isActive = activeTab === item.tab;
                return (
                  <a
                    key={item.tab}
                    href={TAB_ROUTES[item.tab]}
                    onClick={goTo(item.tab)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.tab === "catalog" && (
                      <span className={`text-[10px] px-1.5 py-0.5 leading-none rounded-full font-bold ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-slate-200/80 text-slate-600"
                      }`}>
                        {productsCount}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>

            {/* Ações da Direita */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Botão Primário: Novo Cálculo */}
              <button
                type="button"
                onClick={onNewProduct}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm rounded-lg transition-all"
              >
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Novo Cálculo</span>
                <span className="sm:hidden">Novo</span>
              </button>

              {/* Perfil & Logout */}
              {onLogout && (
                <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200">
                  <div
                    title={userEmail ? `Conectado como ${userEmail}` : "Usuário conectado"}
                    className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg text-slate-700 text-xs font-semibold max-w-[180px]"
                  >
                    <div className="w-4 h-4 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold" aria-hidden="true">
                      {userInitial}
                    </div>
                    <span className="text-[11px] truncate">{userEmail || "Conectado"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Sair do sistema (Logout)"
                    aria-label="Sair do sistema"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Botão Menu Mobile */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="menu-mobile"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
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
              <SlidersHorizontal className="w-3 h-3 text-slate-400" aria-hidden="true" />
              <span>Base:</span>
            </span>

            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200/90 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
              <span>Filamento: <strong className="text-slate-800">{formatBRL(settings.defaultFilamentPricePerKg)}/kg</strong></span>
            </div>

            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200/90 shadow-2xs">
              <Zap className="w-3 h-3 text-amber-500" aria-hidden="true" />
              <span>Energia: <strong className="text-slate-800">{formatBRL(settings.energyKwhPrice)}/kWh</strong></span>
            </div>

            <div className="hidden lg:flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200/90 shadow-2xs">
              <span>Impressora padrão: <strong className="text-slate-800">{settings.defaultPrinterWatts} W</strong></span>
            </div>

            <div className="hidden sm:flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200/90 shadow-2xs">
              <span>Perda Padrão: <strong className="text-slate-800">{settings.defaultVariableCostPercent}%</strong></span>
            </div>

            <a
              href={TAB_ROUTES.settings}
              onClick={goTo("settings")}
              className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-0.5 transition-colors"
            >
              <span>Editar Taxas</span>
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>

          {/* Ferramentas e Ações Secundárias */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={onExportExcel}
              title="Baixar planilha Excel (.xlsx) com catálogo completo e abas"
              className="flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span>Exportar Excel</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. MENU MOBILE DESDOBRÁVEL */}
      {mobileMenuOpen && (
        <nav id="menu-mobile" aria-label="Navegação principal (mobile)" className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1 shadow-md">
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.tab;
            return (
              <a
                key={item.tab}
                href={TAB_ROUTES[item.tab]}
                onClick={goTo(item.tab)}
                aria-current={isActive ? "page" : undefined}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600"
                }`}
              >
                <span className="flex items-center gap-2">
                  {item.mobileIcon}
                  <span>{item.mobileLabel}</span>
                </span>
                {item.tab === "catalog" && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                    {productsCount}
                  </span>
                )}
              </a>
            );
          })}

          {userEmail && (
            <p className="px-3 pt-2 text-[11px] text-slate-400 truncate">Conectado como <b className="text-slate-600">{userEmail}</b></p>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => { onExportExcel(); setMobileMenuOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Exportar Excel</span>
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1 px-3 py-2 text-xs text-rose-600 bg-rose-50 rounded-lg font-medium hover:bg-rose-100"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sair</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
