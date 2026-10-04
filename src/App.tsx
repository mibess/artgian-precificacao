import React, { useState, useEffect, useRef, useCallback } from "react";
import { ProductItem, GlobalSettings, Filament, Printer, PackagingItem, CustomPackagingAddon } from "./types/pricing";
import { defaultSettings, defaultFilaments, defaultPrinters, defaultPackagings, defaultCustomPackagingAddons } from "./data/defaultData";
import { APP_ENV } from "./config/env";
import { FullScreenMessage } from "./components/FullScreenMessage";
import { Navbar } from "./components/Navbar";
import { ProductList } from "./components/ProductList";
import { ProductEditor } from "./components/ProductEditor";
import { SettingsView } from "./components/SettingsView";
import { SimulatorView } from "./components/SimulatorView";
import { QuoteModal } from "./components/QuoteModal";
import { exportToExcel } from "./utils/excelIO";
import { LoginScreen } from "./components/LoginScreen";
import { ToastContainer, ToastMessage } from "./components/Toast";
import {
  isSupabaseConfigured,
  getCurrentUser,
  signOutFromCloud,
  onAuthStateChange,
  fetchProductsFromCloud,
  saveProductToCloud,
  deleteProductFromCloud,
  fetchFilamentsFromCloud,
  saveAllFilamentsToCloud,
  fetchPrintersFromCloud,
  saveAllPrintersToCloud,
  fetchPackagingsFromCloud,
  saveAllPackagingsToCloud,
  fetchCustomAddonsFromCloud,
  saveAllCustomAddonsToCloud,
  fetchSettingsFromCloud,
  saveSettingsToCloud
} from "./services/supabase";
import { 
  getTabFromPath, 
  getPathForTab, 
  getProductIdFromSearch, 
  TabType 
} from "./utils/routes";

export function App() {
  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback((message: string, type: ToastMessage["type"] = "success", title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Estado em memória: espelho dos dados da nuvem (nada é persistido no navegador)
  const [products, setProducts] = useState<ProductItem[]>([]);
  const productsRef = useRef<ProductItem[]>(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [filaments, setFilaments] = useState<Filament[]>(defaultFilaments);
  const [printers, setPrinters] = useState<Printer[]>(defaultPrinters);
  const [packagings, setPackagings] = useState<PackagingItem[]>(defaultPackagings);
  const [customAddons, setCustomAddons] = useState<CustomPackagingAddon[]>(defaultCustomPackagingAddons);

  // Estado de carga da nuvem
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Contador de sincronizações ativas
  const [syncOps, setSyncOps] = useState<number>(0);
  const isSyncing = syncOps > 0;
  const startSync = () => setSyncOps(n => n + 1);
  const endSync = () => setSyncOps(n => Math.max(0, n - 1));

  // Navegação sincronizada com URL e Rotas
  const [activeTab, setActiveTab] = useState<TabType>(() => getTabFromPath(window.location.pathname));
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [quoteProduct, setQuoteProduct] = useState<ProductItem | null>(null);
  const [quoteMargin, setQuoteMargin] = useState<number>(1.0);

  // Autenticação: a sessão é gerenciada exclusivamente pelo Supabase Auth
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(() => isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    getCurrentUser()
      .then(user => setIsAuthenticated(Boolean(user)))
      .finally(() => setAuthChecking(false));

    const { data: authListener } = onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (userEmail: string) => {
    setIsAuthenticated(true);
    showToast(`Bem-vindo, ${userEmail}!`, "success");
  };

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      await signOutFromCloud();
      setProducts([]);
      setDataLoaded(false);
      setIsAuthenticated(false);
      showToast("Sessão encerrada com sucesso.", "info");
    }
  };


  // Navegação centralizada que atualiza a URL sem recarregar a página
  const navigateToTab = (tab: TabType, productToEdit?: ProductItem | null, replace = false) => {
    setActiveTab(tab);
    if (tab !== "editor") {
      setEditingProduct(null);
    } else if (productToEdit !== undefined) {
      setEditingProduct(productToEdit);
    }

    const newPath = getPathForTab(tab, productToEdit?.id);
    const currentPath = window.location.pathname + window.location.search;

    if (currentPath !== newPath) {
      if (replace) {
        window.history.replaceState({ tab, productId: productToEdit?.id }, "", newPath);
      } else {
        window.history.pushState({ tab, productId: productToEdit?.id }, "", newPath);
      }
    }
  };

  // Suporte a histórico do navegador (Voltar / Avançar)
  useEffect(() => {
    if (window.location.pathname === "/" || window.location.pathname === "") {
      window.history.replaceState({ tab: "catalog" }, "", "/catalogo");
    }

    const handlePopState = () => {
      const tab = getTabFromPath(window.location.pathname);
      setActiveTab(tab);

      if (tab === "editor") {
        const prodId = getProductIdFromSearch(window.location.search);
        if (prodId) {
          const found = productsRef.current.find(p => p.id === prodId);
          setEditingProduct(found || null);
        } else {
          setEditingProduct(null);
        }
      } else {
        setEditingProduct(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Carregamento da nuvem (única fonte de verdade). Em caso de erro, não usa dados locais.
  useEffect(() => {
    if (!isSupabaseConfigured() || !isAuthenticated) return;

    let isMounted = true;
    async function loadCloudData() {
      startSync();
      setLoadError(null);
      setDataLoaded(false);
      try {
        const [cloudProds, cloudSettings, cloudFilaments, cloudPrinters, cloudPackagings, cloudCustomAddons] = await Promise.all([
          fetchProductsFromCloud(),
          fetchSettingsFromCloud(),
          fetchFilamentsFromCloud(),
          fetchPrintersFromCloud(),
          fetchPackagingsFromCloud(),
          fetchCustomAddonsFromCloud()
        ]);

        if (!isMounted) return;

        // Produtos são essenciais: null significa falha de rede/permissão (vazio é []).
        if (cloudProds === null) {
          setLoadError("Falha ao consultar os produtos no banco. Verifique sua conexão e se as tabelas do banco deste ambiente foram criadas.");
          return;
        }

        setProducts(cloudProds);

        // Insumos ausentes (usuário novo): mantém padrões em memória até o primeiro salvamento.
        if (cloudSettings) setSettings(cloudSettings);
        if (cloudFilaments && cloudFilaments.length > 0) setFilaments(cloudFilaments);
        if (cloudPrinters && cloudPrinters.length > 0) setPrinters(cloudPrinters);
        if (cloudPackagings && cloudPackagings.length > 0) setPackagings(cloudPackagings);
        if (cloudCustomAddons && cloudCustomAddons.length > 0) setCustomAddons(cloudCustomAddons);

        const prodId = getProductIdFromSearch(window.location.search);
        if (prodId) {
          setEditingProduct(cloudProds.find(p => p.id === prodId) || null);
        }

        setDataLoaded(true);
      } catch (err) {
        console.warn("[App] Erro ao carregar dados da nuvem:", err);
        if (isMounted) setLoadError("Erro inesperado ao carregar os dados da nuvem.");
      } finally {
        if (isMounted) endSync();
      }
    }

    loadCloudData();
    return () => { isMounted = false; };
  }, [isAuthenticated, reloadKey]);


  // Ações de Produtos (a nuvem é a única fonte de verdade; estado em memória é espelho)
  const handleSaveProduct = async (savedProduct: ProductItem) => {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === savedProduct.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedProduct;
        return next;
      }
      return [savedProduct, ...prev];
    });
    navigateToTab("catalog");

    startSync();
    const ok = await saveProductToCloud(savedProduct);
    endSync();
    if (ok) {
      showToast(`Produto "${savedProduct.name}" salvo com sucesso!`, "success");
    } else {
      showToast(`Falha ao salvar "${savedProduct.name}" na nuvem. Recarregue a página antes de continuar.`, "error");
    }
  };

  const handleDuplicateProduct = async (prod: ProductItem) => {
    const newId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicated: ProductItem = {
      ...prod,
      id: newId,
      name: `${prod.name} (Cópia)`,
      parts: prod.parts.map(p => ({ ...p, id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setProducts(prev => [duplicated, ...prev]);

    startSync();
    const ok = await saveProductToCloud(duplicated);
    endSync();
    if (ok) {
      showToast(`Cópia criada: "${duplicated.name}"`, "success");
    } else {
      showToast("Falha ao salvar a cópia na nuvem.", "error");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const prod = products.find(p => p.id === productId);
    const prodName = prod?.name || "Produto";

    if (window.confirm(`Deseja realmente excluir "${prodName}"?`)) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      startSync();
      const ok = await deleteProductFromCloud(productId);
      endSync();
      if (ok) {
        showToast(`"${prodName}" excluído com sucesso.`, "info");
      } else {
        showToast("Erro ao apagar da nuvem. Recarregue a página para ver o estado real.", "error");
      }
    }
  };

  const handleSaveSettings = async (newSettings: GlobalSettings) => {
    setSettings(newSettings);
    startSync();
    const ok = await saveSettingsToCloud(newSettings);
    endSync();
    if (ok) {
      showToast("Configurações salvas na nuvem!", "success");
    } else {
      showToast("Falha ao salvar as configurações na nuvem.", "error");
    }
  };

  const handleSaveFilaments = async (newFilaments: Filament[]) => {
    setFilaments(newFilaments);
    startSync();
    const ok = await saveAllFilamentsToCloud(newFilaments);
    endSync();
    if (!ok) showToast("Falha ao salvar filamentos na nuvem.", "error");
  };

  const handleSavePrinters = async (newPrinters: Printer[]) => {
    setPrinters(newPrinters);
    startSync();
    const ok = await saveAllPrintersToCloud(newPrinters);
    endSync();
    if (!ok) showToast("Falha ao salvar impressoras na nuvem.", "error");
  };

  const handleSavePackagings = async (newPackagings: PackagingItem[]) => {
    setPackagings(newPackagings);
    startSync();
    const ok = await saveAllPackagingsToCloud(newPackagings);
    endSync();
    if (!ok) showToast("Falha ao salvar embalagens na nuvem.", "error");
  };

  const handleSaveCustomAddons = async (newAddons: CustomPackagingAddon[]) => {
    setCustomAddons(newAddons);
    startSync();
    const ok = await saveAllCustomAddonsToCloud(newAddons);
    endSync();
    if (!ok) showToast("Falha ao salvar personalizados na nuvem.", "error");
  };


  const handleEditProduct = (prod: ProductItem) => {
    navigateToTab("editor", prod);
  };

  const handleNewProduct = () => {
    navigateToTab("editor", null);
  };

  const handleExportExcel = () => {
    exportToExcel(products, settings, filaments, printers, packagings, customAddons);
    showToast("Catálogo Excel exportado com sucesso!", "success");
  };

  // Sem credenciais do Supabase para o ambiente atual: orienta a configurar
  if (!isSupabaseConfigured()) {
    return (
      <FullScreenMessage
        title={`Banco de ${APP_ENV === "production" ? "produção" : "desenvolvimento"} não configurado`}
        description={
          APP_ENV === "production"
            ? "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente do build de produção."
            : "Crie o arquivo .env.development.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do projeto Supabase de desenvolvimento (veja o README)."
        }
      />
    );
  }

  if (authChecking) {
    return <FullScreenMessage title="Verificando sessão..." />;
  }

  // Se não estiver autenticado, exige login
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (loadError) {
    return (
      <FullScreenMessage
        title="Não foi possível carregar seus dados"
        description={loadError}
        actionLabel="Tentar novamente"
        onAction={() => setReloadKey(k => k + 1)}
      />
    );
  }

  if (!dataLoaded) {
    return <FullScreenMessage title="Carregando seus dados da nuvem..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => navigateToTab(tab)}
        settings={settings}
        onNewProduct={handleNewProduct}
        onExportExcel={handleExportExcel}
        productsCount={products.length}
        isSyncing={isSyncing}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "catalog" && (
          <ProductList
            products={products}
            settings={settings}
            filaments={filaments}
            printers={printers}
            packagings={packagings}
            customAddons={customAddons}
            onEditProduct={handleEditProduct}
            onDuplicateProduct={handleDuplicateProduct}
            onDeleteProduct={handleDeleteProduct}
            onNewProduct={handleNewProduct}
            onOpenQuote={(prod, margin) => {
              setQuoteProduct(prod);
              if (margin !== undefined) {
                setQuoteMargin(margin);
              }
            }}
          />
        )}

        {activeTab === "editor" && (
          <ProductEditor
            key={editingProduct?.id || "new-product"}
            product={editingProduct}
            settings={settings}
            filaments={filaments}
            printers={printers}
            packagings={packagings}
            customAddons={customAddons}
            onSave={handleSaveProduct}
            onCancel={() => {
              navigateToTab("catalog");
            }}
          />
        )}

        {activeTab === "simulator" && (
          <SimulatorView
            products={products}
            settings={settings}
            filaments={filaments}
            printers={printers}
            packagings={packagings}
            customAddons={customAddons}
          />
        )}

        {activeTab === "settings" && (
          <SettingsView
            products={products}
            settings={settings}
            filaments={filaments}
            printers={printers}
            packagings={packagings}
            customAddons={customAddons}
            onSaveSettings={handleSaveSettings}
            onSaveFilaments={handleSaveFilaments}
            onSavePrinters={handleSavePrinters}
            onSavePackagings={handleSavePackagings}
            onSaveCustomAddons={handleSaveCustomAddons}
          />
        )}
      </main>

      {/* Modal de Orçamento WhatsApp / Impressão */}
      {quoteProduct && (
        <QuoteModal
          product={quoteProduct}
          settings={settings}
          filaments={filaments}
          printers={printers}
          packagings={packagings}
          customAddons={customAddons}
          initialMargin={quoteMargin}
          onClose={() => setQuoteProduct(null)}
        />
      )}

      {/* Notificações Toast */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
