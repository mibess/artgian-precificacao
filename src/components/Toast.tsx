import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-slide-up ${
            toast.type === "success"
              ? "bg-emerald-900/90 border-emerald-700 text-white"
              : toast.type === "error"
              ? "bg-rose-900/90 border-rose-700 text-white"
              : toast.type === "warning"
              ? "bg-amber-900/90 border-amber-700 text-white"
              : "bg-slate-900/90 border-slate-700 text-white"
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
            {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-300" />}
            {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-300" />}
            {toast.type === "info" && <Info className="w-5 h-5 text-sky-300" />}
          </div>

          <div className="flex-1 min-w-0">
            {toast.title && <h4 className="text-xs font-bold leading-tight mb-0.5">{toast.title}</h4>}
            <p className="text-xs text-slate-200 leading-snug break-words">{toast.message}</p>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 text-slate-300 hover:text-white p-0.5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
