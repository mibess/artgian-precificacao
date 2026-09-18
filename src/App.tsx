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

  // Navegação
  const [activeTab, setActiveTab] = useState<"catalog" | "editor" | "simulator" | "settings">("catalog");
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [quoteProduct, setQuoteProduct] = useState<ProductItem | null>(null);
  const [quoteMargin, setQuoteMargin] = useState<number>(1.0);

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
        if (cloudProds && cloudProds.length > 0) setProducts(cloudProds);
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
    setEditingProduct(null);
    setActiveTab("catalog");

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
    setEditingProduct(prod);
    setActiveTab("editor");
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setActiveTab("editor");
  };

  const handleExportExcel = () => {
    exportToExcel(products, settings, filaments, printers);
  };

  const handleResetToDefaults = () => {
    if (window.confirm("Isso restaurará os produtos e configurações iniciais da planilha. Deseja continuar?")) {
      setProducts(defaultProducts);
      setSettings(defaultSettings);
      setFilaments(defaultFilaments);
      setPrinters(defaultPrinters);
      localStorage.clear();
      alert("Configurações restauradas com sucesso!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        onNewProduct={handleNewProduct}
        onExportExcel={handleExportExcel}
        onResetDefaults={handleResetToDefaults}
        productsCount={products.length}
        isSyncing={isSyncing}
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
              setEditingProduct(null);
              setActiveTab("catalog");
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
            onResetToDefaults={handleResetToDefaults}
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
