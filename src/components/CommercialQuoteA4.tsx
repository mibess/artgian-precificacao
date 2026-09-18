import React from "react";
import { ProductItem, PricingBreakdown } from "../types/pricing";
import logoArtgian from "../assets/logo-artgian.png";

interface CommercialQuoteA4Props {
  product: ProductItem;
  pricing: PricingBreakdown;
  selectedMarginPercent: number;
  customerName?: string;
  customerPhone?: string;
  deliveryDate?: string;
  quoteNumber?: string;
  pixDiscountPercent?: number; // e.g. 5% de desconto no Pix opcional
}

export const CommercialQuoteA4: React.FC<CommercialQuoteA4Props> = ({
  product,
  pricing,
  selectedMarginPercent,
  customerName = "",
  customerPhone = "",
  deliveryDate = "",
  quoteNumber = "",
  pixDiscountPercent = 0
}) => {
  const numMargin = Number(selectedMarginPercent);
  const marginRow = pricing.margins.find(m => Math.abs(m.marginPercent - numMargin) < 0.005)
    || pricing.margins.find(m => Math.abs(m.marginPercent - 1.0) < 0.005)
    || pricing.margins[0];
  const shopee = marginRow.marketplacePrices["shopee"];
  const isBatch = product.quantityInBatch > 1;

  const totalValue = marginRow.directSalePrice;
  const unitValue = marginRow.directUnitSalePrice;

  // Valor com desconto Pix (se configurado)
  const pixValue = pixDiscountPercent > 0 ? totalValue * (1 - pixDiscountPercent / 100) : totalValue;

  const today = new Date();
  const todayStr = today.toLocaleDateString("pt-BR");
  const validUntil = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR");
  const displayQuoteNum = quoteNumber || ("PROP-" + today.getFullYear() + "-" + product.id.slice(-4).toUpperCase());

  return (
    <div className="w-[210mm] min-h-[285mm] max-h-[295mm] bg-white text-slate-800 p-8 flex flex-col justify-between font-sans leading-tight print:p-0 print:m-0 print:w-full">
      
      {/* CABEÇALHO EXECUTIVO */}
      <div>
        <div className="flex items-center justify-between border-b-2 border-amber-600/40 pb-4">
          <div className="flex items-center gap-4">
            <img 
              src={logoArtgian} 
              alt="Artgian Studio Logo" 
              className="w-16 h-16 object-contain rounded-full border border-amber-200 shadow-xs"
            />
            <div>
              <h1 className="text-2xl font-serif font-black tracking-widest text-slate-950 uppercase">
                Artgian Studio
              </h1>
              <p className="text-[11px] uppercase tracking-widest text-amber-700 font-bold">
                Ateliê de Criação & Impressão 3D
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Projetos Especiais • Colecionáveis • Peças Decorativas & Corporativas
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block">Proposta Comercial</span>
            <span className="text-sm font-black text-slate-900 font-mono block">{displayQuoteNum}</span>
            <span className="text-[10px] text-slate-500 block">Emissão: {todayStr}</span>
            <span className="text-[10px] text-amber-700 font-bold block">Validade: {validUntil} (15 dias)</span>
          </div>
        </div>

        {/* Faixa Dourada com Título */}
        <div className="mt-3 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white px-4 py-2 rounded-lg flex items-center justify-between shadow-xs">
          <span className="text-xs font-serif font-bold uppercase tracking-wider">
            Orçamento & Especificações do Projeto
          </span>
          <span className="text-[10px] text-amber-300 font-medium">
            Proposta Personalizada
          </span>
        </div>
      </div>

      {/* DADOS DO CLIENTE */}
      <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 space-y-1.5">
        <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block border-b border-slate-200 pb-1">
          Destinatário / Cliente
        </span>
        <div className="grid grid-cols-12 gap-3 text-xs pt-1">
          <div className="col-span-8 flex items-baseline gap-2">
            <span className="font-bold text-slate-700 whitespace-nowrap">Cliente:</span>
            <div className="flex-1 border-b border-slate-400 min-h-[18px] font-bold text-slate-900 px-1">
              {customerName}
            </div>
          </div>

          <div className="col-span-4 flex items-baseline gap-2">
            <span className="font-bold text-slate-700 whitespace-nowrap">Contato / WhatsApp:</span>
            <div className="flex-1 border-b border-slate-400 min-h-[18px] font-bold text-slate-900 px-1">
              {customerPhone}
            </div>
          </div>
        </div>
      </div>

      {/* TABELA DE PRODUTOS E ESCOPO */}
      <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
        <div className="bg-slate-100 px-3.5 py-1.5 border-b border-slate-200 flex justify-between items-center">
          <span className="text-[10px] uppercase font-black text-slate-700 tracking-wider">
            Detalhamento dos Itens & Serviços
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Tecnologia FDM de Alta Resolução</span>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3 w-10">Item</th>
              <th className="py-2.5 px-3">Descrição do Produto & Acabamento</th>
              <th className="py-2.5 px-3 text-center w-16">Qtd</th>
              <th className="py-2.5 px-3 text-right w-24">Valor Unit.</th>
              <th className="py-2.5 px-3 text-right w-28">Valor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-3 px-3 font-bold text-slate-400">01</td>
              <td className="py-3 px-3">
                <div className="font-black text-slate-900 text-sm">{product.name}</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Confeccionado em termoplástico PLA de alta qualidade, acabamento manual de ateliê, textura precisa e montagem cuidadosa.
                </div>
                {product.notes && (
                  <div className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                    Especificações: {product.notes}
                  </div>
                )}
              </td>
              <td className="py-3 px-3 text-center font-bold text-slate-800">
                {product.quantityInBatch} {isBatch ? "un" : "un"}
              </td>
              <td className="py-3 px-3 text-right font-medium text-slate-700">
                R$ {unitValue.toFixed(2)}
              </td>
              <td className="py-3 px-3 text-right font-black text-slate-950 text-sm">
                R$ {totalValue.toFixed(2)}
              </td>
            </tr>
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-300">
            <tr>
              <td colSpan={3} className="py-2 px-3 text-right font-bold text-slate-600 text-xs">
                TOTAL DA PROPOSTA:
              </td>
              <td colSpan={2} className="py-2 px-3 text-right font-black text-base text-slate-950">
                R$ {totalValue.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* CONDIÇÕES COMERCIAIS & FORMAS DE PAGAMENTO */}
      <div className="border border-slate-200 rounded-lg p-3.5 space-y-2 bg-slate-50/40">
        <span className="text-[10px] uppercase font-black text-slate-700 tracking-wider block border-b border-slate-200 pb-1">
          Condições Comerciais & Pagamento Facilitado
        </span>

        <div className="grid grid-cols-3 gap-3 pt-1">
          {/* Opção Pix */}
          <div className="border border-emerald-200 bg-emerald-50/50 p-2.5 rounded-lg text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Opção 1 • À Vista no Pix</span>
            <span className="text-lg font-black text-emerald-700 block my-0.5">
              R$ {pixValue.toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Início imediato da produção</span>
          </div>

          {/* Opção Cartão */}
          <div className="border border-slate-200 bg-white p-2.5 rounded-lg text-center">
            <span className="text-[10px] uppercase font-bold text-slate-700 block">Opção 2 • Cartão de Crédito</span>
            <span className="text-base font-black text-slate-800 block my-0.5">
              R$ {totalValue.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500">Parcelamento disponível via link</span>
          </div>

          {/* Opção Shopee */}
          <div className="border border-orange-200 bg-orange-50/50 p-2.5 rounded-lg text-center">
            <span className="text-[10px] uppercase font-bold text-orange-800 block">Opção 3 • Shopee</span>
            <span className="text-base font-black text-orange-700 block my-0.5">
              R$ {(shopee?.salePrice || totalValue).toFixed(2)}
            </span>
            <span className="text-[10px] text-orange-600 font-medium">Frete grátis / cupons do app</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-600 pt-1 flex justify-between">
          <span><b>Prazo de Confecção:</b> {deliveryDate ? deliveryDate : "2 a 5 dias úteis após a aprovação do pedido"}</span>
          <span><b>Frete / Retirada:</b> A combinar com o cliente</span>
        </div>
      </div>

      {/* CUIDADOS COM A PEÇA & TERMOS DE GARANTIA */}
      <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-600">
        <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/30 space-y-1">
          <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider">
            Recomendações & Cuidados com o Produto
          </span>
          <p className="leading-relaxed">
            Peça confeccionada em PLA ecológico de alta durabilidade. Não expor a temperaturas superiores a 55°C (como interior de veículos fechados sob sol). Para limpeza, utilizar apenas pano seco ou levemente umedecido em água.
          </p>
        </div>

        <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/30 space-y-1">
          <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider">
            Garantia de Satisfação Artgian Studio
          </span>
          <p className="leading-relaxed">
            Garantia integral contra falhas estruturais de fabricação ou delaminação de camadas. Cada peça é rigorosamente inspecionada manualmente antes do envio.
          </p>
        </div>
      </div>

      {/* ASSINATURA E ACEITE */}
      <div className="pt-4 border-t border-slate-200">
        <div className="grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 h-8 mb-1"></div>
            <span className="font-serif font-bold text-slate-900 block">Artgian Studio</span>
            <span className="text-[10px] text-slate-500">Ateliê de Impressão 3D & Design</span>
          </div>

          <div>
            <div className="border-b border-slate-400 h-8 mb-1"></div>
            <span className="font-bold text-slate-900 block">
              {customerName || "De Acordo do Cliente"}
            </span>
            <span className="text-[10px] text-slate-500">Data: _____/_____/_________</span>
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] text-slate-400">
        <span>Artgian Studio • A arte da impressão tridimensional</span>
        <span>{displayQuoteNum} • Proposta válida por 15 dias</span>
        <span>Página 1 de 1</span>
      </div>

    </div>
  );
};
