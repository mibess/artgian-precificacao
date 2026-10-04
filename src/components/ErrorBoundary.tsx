import React from "react";
import { FullScreenMessage } from "./FullScreenMessage";

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Evita a tela branca: um erro de renderização mostra uma mensagem com opção de recarregar. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Erro inesperado na interface:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <FullScreenMessage
          title="Algo deu errado ao exibir esta tela"
          description="Seus dados salvos na nuvem não foram afetados. Recarregue a página para continuar."
          actionLabel="Recarregar página"
          onAction={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
