import React, { useState } from "react";
import { ProductItem, GlobalSettings, Filament, Printer } from "../types/pricing";
import { calculatePricing, AVAILABLE_MARGIN_OPTIONS } from "../utils/calculator";
import { ProductionSheetA4 } from "./ProductionSheetA4";
import { CommercialQuoteA4 } from "./CommercialQuoteA4";
import { 
  X, 
  Printer as PrintIcon, 
  FileText, 
  Briefcase, 
  MessageCircle, 
  Copy, 
  Check, 
  User, 
  Phone, 
  Calendar,
  Sparkles
} from "lucide-react";

interface QuoteModalProps {
  product: ProductItem;
  settings: GlobalSettings;
  filaments: Filament[];
  printers: Printer[];
  initialMargin?: number;
  onClose: () => void;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  product,
  settings,
  filaments,
  printers,
  initialMargin = 1.0,
  onClose
}) => {
  // Modo de visualização: Ficha de Produção, Orçamento Comercial ou WhatsApp
  const [activeDocType, setActiveDocType] = useState<"production" | "commercial" | "whatsapp">("production");
  const [selectedMargin, setSelectedMargin] = useState<number>(initialMargin);
  
  // Campos de cliente (opcionais: podem ser digitados ou deixados em branco para preencher à mão)
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");

  const [copied, setCopied] = useState(false);

  const pricing = calculatePricing(product, settings, filaments, printers);
  const numMargin = Number(selectedMargin);
  const marginRow = pricing.margins.find(m => Math.abs(m.marginPercent - numMargin) < 0.005)
    || pricing.margins.find(m => Math.abs(m.marginPercent - 1.0) < 0.005)
    || pricing.margins[0];
  const shopeePrice = marginRow.marketplacePrices["shopee"]?.salePrice ?? 0;
  const isBatch = product.quantityInBatch > 1;

  // Disparar impressão nativa limpa
  const handlePrint = () => {
    window.print();
  };

  // Texto formatado para WhatsApp
  const generateWhatsAppMessage = () => {
    let msg = "*ORÇAMENTO ARTGIAN STUDIO* 🖨️✨\n\n";
    if (customerName) msg += `Olá, *${customerName}*! Tudo bem?\n\n`;
    msg += "Segue a proposta detalhada para o seu projeto:\n\n";
    msg += `*Produto:* ${product.name}\n`;
    if (product.category) msg += `*Categoria:* ${product.category}\n`;
    msg += `*Tempo estimado de produção:* ${pricing.totalTimeString}\n`;
    msg += `*Peso aproximado do modelo:* ${pricing.totalGrams}g\n\n`;

    if (isBatch) {
      msg += `*Quantidade:* ${product.quantityInBatch} unidades (Lote)\n`;
      msg += `*Valor Total:* R$ ${marginRow.directSalePrice.toFixed(2).replace(".", ",")}\n`;
      msg += `*Valor Unitário:* R$ ${marginRow.directUnitSalePrice.toFixed(2).replace(".", ",")}/un\n\n`;
    } else {
      msg += `*Valor do Projeto:* R$ ${marginRow.directSalePrice.toFixed(2).replace(".", ",")}\n\n`;
    }

    if (deliveryDate) {
      msg += `🗓️ *Previsão de Entrega:* ${deliveryDate}\n\n`;
    }

    msg += "💳 *Condições de Pagamento:*\n";
    msg += "• À vista via Pix com início imediato\n";
    msg += "• Cartão de Crédito parcelado\n";
    msg += `• Compra garantida via Shopee: R$ ${shopeePrice.toFixed(2).replace(".", ",")}\n\n`;
    msg += "Ficamos à disposição para tirar qualquer dúvida e iniciar a sua produção! 🚀";

    return msg;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex flex-col justify-between overflow-y-auto">
      
      {/* TOOLBAR SUPERIOR (Oculta na impressão com .no-print) */}
      <div className="no-print sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white px-4 sm:px-6 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Seletor de Tipo de Documento */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider hidden sm:inline">
              Relatório:
            </span>
            <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveDocType("production")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeDocType === "production"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ficha do Cliente (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDocType("commercial")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeDocType === "commercial"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Orçamento Comercial (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDocType("whatsapp")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeDocType === "whatsapp"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Seletor de Margem & Botão de Impressão */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Margem:</span>
              <select
                value={selectedMargin.toString()}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val)) setSelectedMargin(val);
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                {AVAILABLE_MARGIN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {activeDocType !== "whatsapp" ? (
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <PrintIcon className="w-4 h-4" />
                <span>Imprimir A4 / Salvar PDF</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copiado!" : "Copiar Texto WhatsApp"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* BARRA DE DADOS DO CLIENTE (Opcional: preencher agora ou deixar em branco para escrever à mão) */}
        {activeDocType !== "whatsapp" && (
          <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome do Cliente (ou deixe vazio para escrever à mão)"
                className="w-full pl-8 pr-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-slate-200 placeholder-slate-500 text-xs focus:ring-1 focus:ring-amber-400 focus:bg-slate-800"
              />
            </div>

            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Telefone / WhatsApp (ex: (11) 99999-9999)"
                className="w-full pl-8 pr-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-slate-200 placeholder-slate-500 text-xs focus:ring-1 focus:ring-amber-400 focus:bg-slate-800"
              />
            </div>

            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                placeholder="Prazo de Entrega (ex: 22/09/2026)"
                className="w-full pl-8 pr-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-slate-200 placeholder-slate-500 text-xs focus:ring-1 focus:ring-amber-400 focus:bg-slate-800"
              />
            </div>
          </div>
        )}

      </div>

      {/* ÁREA DE PRÉ-VISUALIZAÇÃO A4 */}
      <div className="flex-1 py-8 px-4 flex justify-center items-start print:p-0 print:m-0">
        
        {activeDocType === "whatsapp" ? (
          /* Visualizador de WhatsApp */
          <div className="no-print bg-white rounded-2xl max-w-xl w-full shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
              <MessageCircle className="w-5 h-5" />
              <span>Orçamento Formatado para WhatsApp</span>
            </div>

            <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-xl font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
              {generateWhatsAppMessage()}
            </pre>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copiado para Área de Transferência!" : "Copiar Texto"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Folha de Papel A4 com proporção e sombra realista */
          <div 
            id="printable-a4-document"
            className="bg-white shadow-2xl rounded-sm mx-auto overflow-hidden print:shadow-none print:rounded-none"
            style={{ width: "210mm", minHeight: "285mm" }}
          >
            {activeDocType === "production" ? (
              <ProductionSheetA4
                product={product}
                pricing={pricing}
                selectedMarginPercent={selectedMargin}
                customerName={customerName}
                customerPhone={customerPhone}
                deliveryDate={deliveryDate}
              />
            ) : (
              <CommercialQuoteA4
                product={product}
                pricing={pricing}
                selectedMarginPercent={selectedMargin}
                customerName={customerName}
                customerPhone={customerPhone}
                deliveryDate={deliveryDate}
              />
            )}
          </div>
        )}

      </div>

    </div>
  );
};
