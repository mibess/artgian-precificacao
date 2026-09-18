import React, { useState, useEffect } from "react";
import { ProductItem, GlobalSettings, Filament, Printer } from "./types/pricing";
import { defaultProducts, defaultSettings, defaultFilaments, defaultPrinters } from "./data/defaultData";
import { Navbar } from "./components/Navbar";
import { ProductList } from "./components/ProductList";
import { ProductEditor } from "./components/ProductEditor";
import { SettingsView } from "./components/SettingsView";
import { SimulatorView } from "./components/SimulatorView";
import { QuoteModal } from "./components/QuoteModal";
import { exportToExcel } from "./utils/excelIO";
import { LoginScreen } from "./components/LoginScreen";
import {
  isSupabaseConfigured,
  fetchProductsFromCloud,
  saveProductToCloud,
  deleteProductFromCloud,
  fetchFilamentsFromCloud,
  saveAllFilamentsToCloud,
  fetchPrintersFromCloud,
  saveAllPrintersToCloud,
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
  // Estado persistido no LocalStorage (Offline-first)
  const [products, setProducts] = useState<ProductItem[]>(() => {
    const saved = localStorage.getItem("3dprice_products");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return defaultProducts;
  });

  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const saved = localStorage.getItem("3dprice_settings");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return defaultSettings;
  });

  const [filaments, setFilaments] = useState<Filament[]>(() => {
    const saved = localStorage.getItem("3dprice_filaments");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return defaultFilaments;
  });

  const [printers, setPrinters] = useState<Printer[]>(() => {
    const saved = localStorage.getItem("3dprice_printers");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return defaultPrinters;
  });

  // Estado de sincronização com Supabase
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Navegação sincronizada com URL e Rotas
  const [activeTab, setActiveTab] = useState<TabType>(() => getTabFromPath(window.location.pathname));
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(() => {
    const prodId = getProductIdFromSearch(window.location.search);
    if (prodId) {
      const saved = localStorage.getItem("3dprice_products");
      if (saved) {
        try {
          const parsed: ProductItem[] = JSON.parse(saved);
          return parsed.find(p => p.id === prodId) || null;
        } catch {}
      }
      return defaultProducts.find(p => p.id === prodId) || null;
    }
    return null;
  });
  const [quoteProduct, setQuoteProduct] = useState<ProductItem | null>(null);
  const [quoteMargin, setQuoteMargin] = useState<number>(1.0);

  // Autenticação de Administrador
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedUser = localStorage.getItem("artgian_auth_user");
    const expectedUser = import.meta.env.VITE_ADMIN_USERNAME || "artgian";
    return savedUser === expectedUser;
  });

  const handleLoginSuccess = (user: string) => {
    localStorage.setItem("artgian_auth_user", user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      localStorage.removeItem("artgian_auth_user");
      setIsAuthenticated(false);
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

  // Suporte a histórico do navegador (Voltar / Avançar) e normalização da raiz
  useEffect(() => {
    // Se acessar a raiz "/", normaliza a URL para "/catalogo"
    if (window.location.pathname === "/" || window.location.pathname === "") {
      window.history.replaceState({ tab: "catalog" }, "", "/catalogo");
    }

    const handlePopState = () => {
      const tab = getTabFromPath(window.location.pathname);
      setActiveTab(tab);

      if (tab === "editor") {
        const prodId = getProductIdFromSearch(window.location.search);
        if (prodId) {
          const found = products.find(p => p.id === prodId);
          if (found) setEditingProduct(found);
        } else {
          setEditingProduct(null);
        }
      } else {
        setEditingProduct(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [products]);

  // Carregamento inicial do Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let isMounted = true;
    async function loadCloudData() {
      setIsSyncing(true);
      try {
        const [cloudProds, cloudSettings, cloudFilaments, cloudPrinters] = await Promise.all([
          fetchProductsFromCloud(),
          fetchSettingsFromCloud(),
          fetchFilamentsFromCloud(),
          fetchPrintersFromCloud()
        ]);

        if (!isMounted) return;
        if (cloudProds && cloudProds.length > 0) {
          setProducts(cloudProds);
          // Se tiver um ID de produto na URL, sincroniza o objeto do produto
          const prodId = getProductIdFromSearch(window.location.search);
          if (prodId) {
            const found = cloudProds.find(p => p.id === prodId);
            if (found) setEditingProduct(found);
          }
        }
        if (cloudSettings) setSettings(cloudSettings);
        if (cloudFilaments && cloudFilaments.length > 0) setFilaments(cloudFilaments);
        if (cloudPrinters && cloudPrinters.length > 0) setPrinters(cloudPrinters);
      } catch (err) {
        console.warn("[App] Erro na sincronização inicial com nuvem:", err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    }

    loadCloudData();
    return () => { isMounted = false; };
  }, []);

  // Sincronizar com LocalStorage para cache instantâneo
  useEffect(() => {
    localStorage.setItem("3dprice_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("3dprice_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("3dprice_filaments", JSON.stringify(filaments));
  }, [filaments]);

  useEffect(() => {
    localStorage.setItem("3dprice_printers", JSON.stringify(printers));
  }, [printers]);

  // Ações de Produtos com sincronização em nuvem
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

    if (isSupabaseConfigured()) {
      setIsSyncing(true);
      await saveProductToCloud(savedProduct);
      setIsSyncing(false);
    }
  };

  const handleDuplicateProduct = async (prod: ProductItem) => {
    const duplicated: ProductItem = {
      ...prod,
      id: `prod-${Date.now()}`,
      name: `${prod.name} (Cópia)`,
      parts: prod.parts.map(p => ({ ...p, id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setProducts(prev => [duplicated, ...prev]);

    if (isSupabaseConfigured()) {
      setIsSyncing(true);
      await saveProductToCloud(duplicated);
      setIsSyncing(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Deseja realmente excluir este produto?")) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      if (isSupabaseConfigured()) {
        setIsSyncing(true);
        await deleteProductFromCloud(productId);
        setIsSyncing(false);
      }
    }
  };

  const handleSaveSettings = async (newSettings: GlobalSettings) => {
    setSettings(newSettings);
    if (isSupabaseConfigured()) {
      setIsSyncing(true);
      await saveSettingsToCloud(newSettings);
      setIsSyncing(false);
    }
  };

  const handleSaveFilaments = async (newFilaments: Filament[]) => {
    setFilaments(newFilaments);
    if (isSupabaseConfigured()) {
      setIsSyncing(true);
      await saveAllFilamentsToCloud(newFilaments);
      setIsSyncing(false);
    }
  };

  const handleSavePrinters = async (newPrinters: Printer[]) => {
    setPrinters(newPrinters);
    if (isSupabaseConfigured()) {
      setIsSyncing(true);
      await saveAllPrintersToCloud(newPrinters);
      setIsSyncing(false);
    }
  };

  const handleEditProduct = (prod: ProductItem) => {
    navigateToTab("editor", prod);
  };

  const handleNewProduct = () => {
    navigateToTab("editor", null);
  };

  const handleExportExcel = () => {
    exportToExcel(products, settings, filaments, printers);
  };

  // Se não estiver autenticado, exige login
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
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
            product={editingProduct}
            settings={settings}
            filaments={filaments}
            printers={printers}
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
          />
        )}

        {activeTab === "settings" && (
          <SettingsView
            settings={settings}
            filaments={filaments}
            printers={printers}
            onSaveSettings={handleSaveSettings}
            onSaveFilaments={handleSaveFilaments}
            onSavePrinters={handleSavePrinters}
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
          initialMargin={quoteMargin}
          onClose={() => setQuoteProduct(null)}
        />
      )}
    </div>
  );
}
