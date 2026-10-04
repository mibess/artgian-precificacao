import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface FullScreenMessageProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Tela cheia para estados de carregamento, configuração ausente ou erro de carga. */
export const FullScreenMessage: React.FC<FullScreenMessageProps> = ({ title, description, actionLabel, onAction }) => {
  const isError = Boolean(description);
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center space-y-3">
        {isError ? (
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        ) : (
          <Loader2 className="w-8 h-8 text-indigo-500 mx-auto animate-spin" />
        )}
        <h1 className="text-base font-bold text-slate-800">{title}</h1>
        {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
