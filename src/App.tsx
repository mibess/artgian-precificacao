import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { ProductItem, GlobalSettings, Filament, Printer, PackagingItem, CustomPackagingAddon } from "./types/pricing";
import { defaultSettings, defaultFilaments, defaultPrinters, defaultPackagings, defaultCustomPackagingAddons } from "./data/defaultData";
import { APP_ENV } from "./config/env";
import { FullScreenMessage } from "./components/FullScreenMessage";
import { Navbar } from "./components/Navbar";
import { ProductList } from "./components/ProductList";
import { LoginScreen } from "./components/LoginScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer, ToastMessage } from "./components/Toast";
import { createId } from "./utils/ids";
import { resolveUserCollections, remapProductReferences } from "./utils/userDefaults";
import {
  isSupabaseConfigured,
  getCurrentUser,
  signOutFromCloud,
  onAuthStateChange,
  consumeSchemaWarning,
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

// Telas secundárias carregadas sob demanda (reduz o bundle inicial)
const ProductEditor = lazy(() => import("./components/ProductEditor").then(m => ({ default: m.ProductEditor })));
const SettingsView = lazy(() => import("./components/SettingsView").then(m => ({ default: m.SettingsView })));
const SimulatorView = lazy(() => import("./components/SimulatorView").then(m => ({ default: m.SimulatorView })));
const QuoteModal = lazy(() => import("./components/QuoteModal").then(m => ({ default: m.QuoteModal })));

interface AuthUser {
  id: string;
  email: string;
}

function toAuthUser(user: { id: string; email?: string | null } | null | undefined): AuthUser | null {
  return user?.id ? { id: user.id, email: user.email || "" } : null;
}

const ViewFallback = () => (
  <div className="flex items-center justify-center py-24 text-xs font-medium text-slate-400" role="status">
    <span className="w-4 h-4 mr-2 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" aria-hidden="true" />
    Carregando...
  </div>
);

export function App() {
  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback((
    message: string,
    type: ToastMessage["type"] = "success",
    title?: string,
    durationMs?: number
  ) => {
    const id = createId("toast");
    setToasts(prev => [...prev, { id, type, title, message }]);
    const duration = durationMs ?? (type === "error" || type === "warning" ? 7000 : 4000);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /** Mostra (uma vez) o aviso de migration pendente detectado pelo serviço. */
  const notifySchemaWarning = useCallback(() => {
    const warning = consumeSchemaWarning();
    if (warning) showToast(warning, "warning", "Atualização do banco pendente", 12000);
  }, [showToast]);

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
  const isSyncingRef = useRef(false);
  isSyncingRef.current = isSyncing;

  // Alterações não salvas na tela atual (editor ou insumos)
  const unsavedChangesRef = useRef(false);
  const handleDirtyChange = useCallback((dirty: boolean) => {
    unsavedChangesRef.current = dirty;
  }, []);
  const startSync = () => setSyncOps(n => n + 1);
  const endSync = () => setSyncOps(n => Math.max(0, n - 1));

  // Navegação sincronizada com URL e Rotas
  const [activeTab, setActiveTab] = useState<TabType>(() => getTabFromPath(window.location.pathname));
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [quoteProduct, setQuoteProduct] = useState<ProductItem | null>(null);
  const [quoteMargin, setQuoteMargin] = useState<number>(1.0);

  // Autenticação: a sessão é gerenciada exclusivamente pelo Supabase Auth
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(() => isSupabaseConfigured());
  const isAuthenticated = Boolean(authUser);
  const userId = authUser?.id ?? null;

  /** Limpa tudo que pertence ao usuário da sessão (evita vazar dados para o próximo login). */
  const resetSessionState = useCallback(() => {
    setProducts([]);
    setSettings(defaultSettings);
    setFilaments(defaultFilaments);
    setPrinters(defaultPrinters);
    setPackagings(defaultPackagings);
    setCustomAddons(defaultCustomPackagingAddons);
    setEditingProduct(null);
    setQuoteProduct(null);
    setLoadError(null);
    setDataLoaded(false);
    unsavedChangesRef.current = false;
  }, []);

  const updateAuthUser = useCallback((next: AuthUser | null) => {
    setAuthUser(prev => (prev?.id === next?.id && prev?.email === next?.email ? prev : next));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    getCurrentUser()
      .then(user => updateAuthUser(toAuthUser(user)))
      .finally(() => setAuthChecking(false));

    const { data: authListener } = onAuthStateChange((_event, session) => {
      const next = toAuthUser(session?.user);
      if (!next) resetSessionState();
      updateAuthUser(next);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [resetSessionState, updateAuthUser]);

  const handleLoginSuccess = (userEmail: string, loggedUserId?: string) => {
    if (loggedUserId) updateAuthUser({ id: loggedUserId, email: userEmail });
    showToast(`Bem-vindo, ${userEmail}!`, "success");
  };

  const handleLogout = async () => {
    const message = unsavedChangesRef.current
      ? "Existem alterações não salvas nesta tela. Deseja realmente sair do sistema e descartá-las?"
      : "Deseja realmente sair do sistema?";
    if (window.confirm(message)) {
      await signOutFromCloud();
      resetSessionState();
      updateAuthUser(null);
      showToast("Sessão encerrada com sucesso.", "info");
    }
  };

  // Avisa antes de fechar/recarregar a aba com alterações não salvas ou salvamentos em andamento
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!unsavedChangesRef.current && !isSyncingRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Navegação centralizada que atualiza a URL sem recarregar a página
  const navigateToTab = (tab: TabType, productToEdit?: ProductItem | null, replace = false, force = false) => {
    if (!force && unsavedChangesRef.current &&
        !window.confirm("Existem alterações não salvas nesta tela. Deseja sair e descartá-las?")) {
      return;
    }
    unsavedChangesRef.current = false;
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
    window.scrollTo({ top: 0 });
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
    if (!isSupabaseConfigured() || !userId) return;

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

        // null = falha de rede/permissão (vazio é []). Sem a lista real, salvar os insumos
        // poderia sobrescrever/remover dados da nuvem, então a carga é interrompida.
        const failed = [
          cloudProds === null && "produtos",
          cloudFilaments === null && "filamentos",
          cloudPrinters === null && "impressoras",
          cloudPackagings === null && "embalagens",
          cloudCustomAddons === null && "personalizados"
        ].filter(Boolean);

        if (failed.length > 0) {
          setLoadError(`Falha ao consultar ${failed.join(", ")} no banco. Verifique sua conexão e se as tabelas do banco deste ambiente foram criadas.`);
          return;
        }

        // Coleções vazias (usuário novo) recebem os padrões com ids próprios do usuário.
        const { collections, idMap } = resolveUserCollections({
          filaments: cloudFilaments!,
          printers: cloudPrinters!,
          packagings: cloudPackagings!,
          customAddons: cloudCustomAddons!
        }, userId);

        const loadedProducts = remapProductReferences(cloudProds!, idMap);
        setProducts(loadedProducts);
        setSettings(cloudSettings ?? defaultSettings);
        setFilaments(collections.filaments);
        setPrinters(collections.printers);
        setPackagings(collections.packagings);
        setCustomAddons(collections.customAddons);

        const prodId = getProductIdFromSearch(window.location.search);
        if (prodId) {
          setEditingProduct(loadedProducts.find(p => p.id === prodId) || null);
        }

        setDataLoaded(true);
      } catch (err) {
        console.warn("[App] Erro ao carregar dados da nuvem:", err);
        if (isMounted) setLoadError("Erro inesperado ao carregar os dados da nuvem. Verifique sua conexão e tente novamente.");
      } finally {
        if (isMounted) endSync();
      }
    }

    loadCloudData();
    return () => { isMounted = false; };
  }, [userId, reloadKey]);


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
    navigateToTab("catalog", undefined, false, true);

    startSync();
    const ok = await saveProductToCloud(savedProduct);
    endSync();
    if (ok) {
      showToast(`Produto "${savedProduct.name}" salvo com sucesso!`, "success");
      notifySchemaWarning();
    } else {
      showToast(`Falha ao salvar "${savedProduct.name}" na nuvem. Recarregue a página antes de continuar.`, "error");
    }
  };

  const handleDuplicateProduct = async (prod: ProductItem) => {
    const now = new Date().toISOString();
    const duplicated: ProductItem = {
      ...prod,
      id: createId("prod"),
      name: `${prod.name} (Cópia)`,
      parts: prod.parts.map(p => ({ ...p, id: createId("part") })),
      createdAt: now,
      updatedAt: now
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

  const handleSaveSettings = async (newSettings: GlobalSettings): Promise<boolean> => {
    setSettings(newSettings);
    startSync();
    const ok = await saveSettingsToCloud(newSettings);
    endSync();
    if (ok) {
      showToast("Configurações salvas na nuvem!", "success");
      notifySchemaWarning();
    } else {
      showToast("Falha ao salvar as configurações na nuvem.", "error");
    }
    return ok;
  };

  const handleSaveFilaments = async (newFilaments: Filament[]): Promise<boolean> => {
    setFilaments(newFilaments);
    startSync();
    const ok = await saveAllFilamentsToCloud(newFilaments);
    endSync();
    if (!ok) showToast("Falha ao salvar filamentos na nuvem.", "error");
    return ok;
  };

  const handleSavePrinters = async (newPrinters: Printer[]): Promise<boolean> => {
    setPrinters(newPrinters);
    startSync();
    const ok = await saveAllPrintersToCloud(newPrinters);
    endSync();
    if (!ok) showToast("Falha ao salvar impressoras na nuvem.", "error");
    return ok;
  };

  const handleSavePackagings = async (newPackagings: PackagingItem[]): Promise<boolean> => {
    setPackagings(newPackagings);
    startSync();
    const ok = await saveAllPackagingsToCloud(newPackagings);
    endSync();
    if (!ok) showToast("Falha ao salvar embalagens na nuvem.", "error");
    return ok;
  };

  const handleSaveCustomAddons = async (newAddons: CustomPackagingAddon[]): Promise<boolean> => {
    setCustomAddons(newAddons);
    startSync();
    const ok = await saveAllCustomAddonsToCloud(newAddons);
    endSync();
    if (!ok) showToast("Falha ao salvar personalizados na nuvem.", "error");
    return ok;
  };


  const handleEditProduct = (prod: ProductItem) => {
    navigateToTab("editor", prod);
  };

  const handleNewProduct = () => {
    navigateToTab("editor", null);
  };

  const handleExportExcel = async () => {
    try {
      // A biblioteca de planilhas é pesada: só é baixada quando o usuário exporta.
      const { exportToExcel } = await import("./utils/excelIO");
      exportToExcel(products, settings, filaments, printers, packagings, customAddons);
      showToast("Catálogo Excel exportado com sucesso!", "success");
    } catch (err) {
      console.error("[App] Falha ao exportar Excel:", err);
      showToast("Não foi possível gerar a planilha. Verifique sua conexão e tente novamente.", "error");
    }
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
      <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo</a>

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
        userEmail={authUser?.email}
      />

      {/* Main Container */}
      <main id="conteudo-principal" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 focus:outline-none">
        <ErrorBoundary key={activeTab}>
          <Suspense fallback={<ViewFallback />}>
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
                onDirtyChange={handleDirtyChange}
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
                onDirtyChange={handleDirtyChange}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Modal de Orçamento WhatsApp / Impressão */}
      {quoteProduct && (
        <ErrorBoundary>
          <Suspense fallback={null}>
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
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Notificações Toast */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
