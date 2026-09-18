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

export function App() {
  // Estado persistido no LocalStorage
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

  // Navegação
  const [activeTab, setActiveTab] = useState<"catalog" | "editor" | "simulator" | "settings">("catalog");
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [quoteProduct, setQuoteProduct] = useState<ProductItem | null>(null);
  const [quoteMargin, setQuoteMargin] = useState<number>(1.0);

  // Sincronizar com LocalStorage
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

  // Ações de Produtos
  const handleSaveProduct = (savedProduct: ProductItem) => {
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
  };

  const handleDuplicateProduct = (prod: ProductItem) => {
    const duplicated: ProductItem = {
      ...prod,
      id: `prod-${Date.now()}`,
      name: `${prod.name} (Cópia)`,
      parts: prod.parts.map(p => ({ ...p, id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setProducts(prev => [duplicated, ...prev]);
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm("Deseja realmente excluir este produto?")) {
      setProducts(prev => prev.filter(p => p.id !== productId));
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
            onSaveSettings={setSettings}
            onSaveFilaments={setFilaments}
            onSavePrinters={setPrinters}
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
