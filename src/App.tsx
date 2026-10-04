import React, { useState, useEffect, useRef, useCallback } from "react";
import { ProductItem, GlobalSettings, Filament, Printer, PackagingItem, CustomPackagingAddon } from "./types/pricing";
import { defaultProducts, defaultSettings, defaultFilaments, defaultPrinters, defaultPackagings, defaultCustomPackagingAddons } from "./data/defaultData";
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

  // Estado persistido no LocalStorage (Offline-first)
  const [products, setProducts] = useState<ProductItem[]>(() => {
    const saved = localStorage.getItem("3dprice_products");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return defaultProducts;
  });
  const productsRef = useRef<ProductItem[]>(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

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

  const [packagings, setPackagings] = useState<PackagingItem[]>(() => {
    const saved = localStorage.getItem("3dprice_packagings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) { console.error(e); }
    }
    return defaultPackagings;
  });

  const [customAddons, setCustomAddons] = useState<CustomPackagingAddon[]>(() => {
    const saved = localStorage.getItem("3dprice_packaging_addons");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { console.error(e); }
    }
    return defaultCustomPackagingAddons;
  });

  // Contador de sincronizações ativas
  const [syncOps, setSyncOps] = useState<number>(0);
  const isSyncing = syncOps > 0;
  const startSync = () => setSyncOps(n => n + 1);
  const endSync = () => setSyncOps(n => Math.max(0, n - 1));

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

  // Autenticação Supabase
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (!isSupabaseConfigured()) return true;
    return Boolean(localStorage.getItem("artgian_auth_user"));
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    getCurrentUser().then(user => {
      if (user) {
        localStorage.setItem("artgian_auth_user", user.email || "autenticado");
        setIsAuthenticated(true);
      }
    });

    const { data: authListener } = onAuthStateChange((_event, session) => {
      if (session?.user) {
        localStorage.setItem("artgian_auth_user", session.user.email || "autenticado");
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("artgian_auth_user");
        setIsAuthenticated(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (userEmail: string) => {
    localStorage.setItem("artgian_auth_user", userEmail);
    setIsAuthenticated(true);
    showToast(`Bem-vindo, ${userEmail}!`, "success");
  };

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      await signOutFromCloud();
      localStorage.removeItem("artgian_auth_user");
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

  // Carregamento inicial do Supabase com Reconciliação Inteligente
  useEffect(() => {
    if (!isSupabaseConfigured() || !isAuthenticated) return;

    let isMounted = true;
    async function loadCloudData() {
      startSync();
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

        // Reconciliar produtos por updatedAt
        if (cloudProds) {
          setProducts(prevLocal => {
            const localMap = new Map(prevLocal.map(p => [p.id, p]));
            const merged = [...cloudProds];

            // Manter e subir produtos locais mais recentes ou não existentes na nuvem
            for (const local of prevLocal) {
              const cloudMatch = cloudProds.find(cp => cp.id === local.id);
              if (!cloudMatch) {
                merged.push(local);
                saveProductToCloud(local).catch(console.error);
              } else {
                const localTime = new Date(local.updatedAt).getTime();
                const cloudTime = new Date(cloudMatch.updatedAt).getTime();
                if (localTime > cloudTime) {
                  const idx = merged.findIndex(m => m.id === local.id);
                  if (idx >= 0) merged[idx] = local;
                  saveProductToCloud(local).catch(console.error);
                }
              }
            }

            const prodId = getProductIdFromSearch(window.location.search);
            if (prodId) {
              const found = merged.find(p => p.id === prodId);
              if (found) setEditingProduct(found);
            }

            return merged;
          });
        }

        if (cloudSettings) setSettings(cloudSettings);
        if (cloudFilaments && cloudFilaments.length > 0) setFilaments(cloudFilaments);
        if (cloudPrinters && cloudPrinters.length > 0) setPrinters(cloudPrinters);
        if (cloudPackagings && cloudPackagings.length > 0) setPackagings(cloudPackagings);
        if (cloudCustomAddons && cloudCustomAddons.length > 0) setCustomAddons(cloudCustomAddons);
      } catch (err) {
        console.warn("[App] Erro na sincronização com a nuvem:", err);
      } finally {
        if (isMounted) endSync();
      }
    }

    loadCloudData();
    return () => { isMounted = false; };
  }, [isAuthenticated]);

  // Sincronizar com LocalStorage
  useEffect(() => {
    localStorage.setItem("3dprice_products", JSON.stringify(products));
    localStorage.setItem("3dprice_schema_version", "2");
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

  useEffect(() => {
    localStorage.setItem("3dprice_packagings", JSON.stringify(packagings));
  }, [packagings]);

  useEffect(() => {
    localStorage.setItem("3dprice_packaging_addons", JSON.stringify(customAddons));
  }, [customAddons]);

  // Ações de Produtos
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
      startSync();
      const ok = await saveProductToCloud(savedProduct);
      endSync();
      if (ok) {
        showToast(`Produto "${savedProduct.name}" salvo com sucesso!`, "success");
      } else {
        showToast(`Produto salvo localmente, mas houve falha ao sincronizar com a nuvem.`, "warning");
      }
    } else {
      showToast(`Produto "${savedProduct.name}" salvo localmente.`, "success");
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

    if (isSupabaseConfigured()) {
      startSync();
      const ok = await saveProductToCloud(duplicated);
      endSync();
      if (ok) {
        showToast(`Cópia criada: "${duplicated.name}"`, "success");
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const prod = products.find(p => p.id === productId);
    const prodName = prod?.name || "Produto";

    if (window.confirm(`Deseja realmente excluir "${prodName}"?`)) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      if (isSupabaseConfigured()) {
        startSync();
        const ok = await deleteProductFromCloud(productId);
        endSync();
        if (ok) {
          showToast(`"${prodName}" excluído com sucesso.`, "info");
        } else {
          showToast(`Excluído localmente, mas erro ao apagar da nuvem.`, "warning");
        }
      } else {
        showToast(`"${prodName}" excluído.`, "info");
      }
    }
  };

  const handleSaveSettings = async (newSettings: GlobalSettings) => {
    setSettings(newSettings);
    if (isSupabaseConfigured()) {
      startSync();
      const ok = await saveSettingsToCloud(newSettings);
      endSync();
      if (ok) {
        showToast("Configurações salvas e sincronizadas na nuvem!", "success");
      } else {
        showToast("Configurações salvas localmente, mas falha ao sincronizar.", "warning");
      }
    } else {
      showToast("Configurações salvas com sucesso!", "success");
    }
  };

  const handleSaveFilaments = async (newFilaments: Filament[]) => {
    setFilaments(newFilaments);
    if (isSupabaseConfigured()) {
      startSync();
      const ok = await saveAllFilamentsToCloud(newFilaments);
      endSync();
      if (!ok) showToast("Aviso: filamentos salvos localmente, erro na nuvem.", "warning");
    }
  };

  const handleSavePrinters = async (newPrinters: Printer[]) => {
    setPrinters(newPrinters);
    if (isSupabaseConfigured()) {
      startSync();
      const ok = await saveAllPrintersToCloud(newPrinters);
      endSync();
      if (!ok) showToast("Aviso: impressoras salvas localmente, erro na nuvem.", "warning");
    }
  };

  const handleSavePackagings = async (newPackagings: PackagingItem[]) => {
    setPackagings(newPackagings);
    if (isSupabaseConfigured()) {
      startSync();
      const ok = await saveAllPackagingsToCloud(newPackagings);
      endSync();
      if (!ok) showToast("Aviso: embalagens salvas localmente, erro na nuvem.", "warning");
    }
  };

  const handleSaveCustomAddons = async (newAddons: CustomPackagingAddon[]) => {
    setCustomAddons(newAddons);
    if (isSupabaseConfigured()) {
      startSync();
      const ok = await saveAllCustomAddonsToCloud(newAddons);
      endSync();
      if (!ok) showToast("Aviso: personalizados salvos localmente, erro na nuvem.", "warning");
    }
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
