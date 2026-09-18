import React from "react";
import { ProductItem, GlobalSettings, Filament, Printer, PricingBreakdown } from "../types/pricing";
import logoArtgian from "../assets/logo-artgian.png";

interface ProductionSheetA4Props {
  product: ProductItem;
  pricing: PricingBreakdown;
  selectedMarginPercent: number;
  customerName?: string;
  customerPhone?: string;
  deliveryDate?: string;
  orderNumber?: string;
}

export const ProductionSheetA4: React.FC<ProductionSheetA4Props> = ({
  product,
  pricing,
  selectedMarginPercent,
  customerName = "",
  customerPhone = "",
  deliveryDate = "",
  orderNumber = ""
}) => {
  const numMargin = Number(selectedMarginPercent);
  const marginRow = pricing.margins.find(m => Math.abs(m.marginPercent - numMargin) < 0.005)
    || pricing.margins.find(m => Math.abs(m.marginPercent - 1.0) < 0.005)
    || pricing.margins[0];
  const shopee = marginRow.marketplacePrices["shopee"];
  const isBatch = product.quantityInBatch > 1;

  const todayStr = new Date().toLocaleDateString("pt-BR");
  const displayOrderNum = orderNumber || ("OS-" + new Date().getFullYear() + "-" + product.id.slice(-4).toUpperCase());

  return (
    <div className="w-[210mm] min-h-[285mm] max-h-[295mm] bg-white text-slate-800 p-8 flex flex-col justify-between font-sans leading-tight print:p-0 print:m-0 print:w-full">
      
      {/* CABEÇALHO */}
      <div className="border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={logoArtgian} 
              alt="Artgian Studio Logo" 
              className="w-16 h-16 object-contain rounded-full border border-amber-200/60 shadow-xs"
            />
            <div>
              <h1 className="text-xl font-serif font-black tracking-wider text-slate-950 uppercase">
                Artgian Studio
              </h1>
              <p className="text-[11px] uppercase tracking-widest text-amber-700 font-semibold">
                Ateliê de Impressão 3D & Design
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Fabricação Aditiva de Alta Precisão • Bambu Lab A1
              </p>
            </div>
          </div>

          <div className="text-right bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Documento Interno</span>
            <span className="text-xs font-black text-slate-900 block font-mono">{displayOrderNum}</span>
            <span className="text-[10px] text-slate-500">Data: {todayStr}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider">
          <span>Ficha de Produção & Controle do Pedido</span>
          <span className="text-[10px] text-amber-400 font-normal">Via Oficina / Arquivo</span>
        </div>
      </div>

      {/* DADOS DO CLIENTE (Preenchimento manual a mão ou digitado) */}
      <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/50 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <span className="text-[10px] uppercase font-black text-slate-700 tracking-wider">
            1. Dados do Cliente & Atendimento
          </span>
          <span className="text-[9px] text-slate-400 italic">
            * Campo para preenchimento manual ou controle
          </span>
        </div>

        <div className="grid grid-cols-12 gap-3 text-xs pt-1">
          <div className="col-span-8 flex items-baseline gap-2">
            <span className="font-bold text-slate-700 whitespace-nowrap">Nome do Cliente:</span>
            <div className="flex-1 border-b border-slate-400 min-h-[18px] font-semibold text-slate-900 px-1">
              {customerName}
            </div>
          </div>

          <div className="col-span-4 flex items-baseline gap-2">
            <span className="font-bold text-slate-700 whitespace-nowrap">Telefone / WhatsApp:</span>
            <div className="flex-1 border-b border-slate-400 min-h-[18px] font-semibold text-slate-900 px-1">
              {customerPhone}
            </div>
          </div>

          <div className="col-span-4 flex items-baseline gap-2">
            <span className="font-bold text-slate-700 whitespace-nowrap">Prazo de Entrega:</span>
            <div className="flex-1 border-b border-slate-400 min-h-[18px] font-semibold text-slate-900 px-1">
              {deliveryDate}
            </div>
          </div>

          <div className="col-span-8 flex items-center gap-3 text-[11px] text-slate-700">
            <span className="font-bold">Status:</span>
            <span className="flex items-center gap-1 font-medium">[ &nbsp; ] Aguardando</span>
            <span className="flex items-center gap-1 font-medium">[ &nbsp; ] Na Fila</span>
            <span className="flex items-center gap-1 font-medium">[ &nbsp; ] Em Impressão</span>
            <span className="flex items-center gap-1 font-medium">[ &nbsp; ] Pronto / Entregue</span>
          </div>
        </div>
      </div>

      {/* DADOS TÉCNICOS DA IMPRESSÃO 3D */}
      <div className="border border-slate-300 rounded-lg p-3.5 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <span className="text-[10px] uppercase font-black text-slate-700 tracking-wider">
            2. Especificações Técnicas do Modelo (3D)
          </span>
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            Máquina: Bambu Lab A1 (Bico 0.4mm)
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5 text-xs pt-1">
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Produto / Modelo</span>
            <span className="font-bold text-slate-900 block truncate" title={product.name}>{product.name}</span>
          </div>

          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Categoria / Quantidade</span>
            <span className="font-bold text-slate-800 block">
              {product.category || "Geral"} • <b>{product.quantityInBatch} {isBatch ? "unidades (Lote)" : "unidade"}</b>
            </span>
          </div>

          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Consumo Total de Filamento</span>
            <span className="font-bold text-emerald-700 block text-sm">{pricing.totalGrams} g</span>
          </div>

          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Tempo Total de Impressão</span>
            <span className="font-bold text-indigo-700 block text-sm">{pricing.totalTimeString}</span>
          </div>
        </div>

        {/* Tabela de partes se for multi-peças */}
        {product.parts.length > 1 && (
          <div className="mt-2 border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">
                <tr>
                  <th className="py-1 px-2">Parte / Cor</th>
                  <th className="py-1 px-2">Peso (g)</th>
                  <th className="py-1 px-2">Tempo Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {product.parts.map((p, i) => (
                  <tr key={i}>
                    <td className="py-1 px-2 font-medium">{p.name}</td>
                    <td className="py-1 px-2 font-bold">{p.filamentGrams} g</td>
                    <td className="py-1 px-2 text-slate-600">{p.printTimeString}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {product.notes && (
          <div className="text-[10px] text-slate-600 italic bg-amber-50/50 p-2 rounded border border-amber-100 mt-1">
            <b>Notas Técnicas:</b> {product.notes}
          </div>
        )}
      </div>

      {/* COMPOSIÇÃO DE CUSTOS & PREÇOS (Uso Interno) */}
      <div className="border border-slate-300 rounded-lg p-3.5 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <span className="text-[10px] uppercase font-black text-slate-700 tracking-wider">
            3. Composição de Custos & Margens da Oficina
          </span>
          <span className="text-[9px] text-slate-500 font-medium">
            Margem Selecionada: <b>{marginRow.marginLabel}</b>
          </span>
        </div>

        <div className="grid grid-cols-12 gap-3 pt-1">
          
          {/* Custos Diretos */}
          <div className="col-span-6 space-y-1 text-xs text-slate-600 border-r border-slate-200 pr-3">
            <div className="flex justify-between">
              <span>Custo Filamento ({pricing.totalGrams}g):</span>
              <span className="font-bold text-slate-800">R$ {pricing.filamentCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Custo Energia ({pricing.totalTimeString}):</span>
              <span className="font-bold text-slate-800">R$ {pricing.energyCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Embalagem + Acessórios:</span>
              <span className="font-bold text-slate-800">R$ {(pricing.packagingCost + pricing.accessoriesCost).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Custo Variável / Perda ({pricing.variableCostPercent}%):</span>
              <span>R$ {pricing.variableCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 text-slate-900 font-extrabold">
              <span>CUSTO TOTAL DE PRODUÇÃO:</span>
              <span className="text-sm text-indigo-700">R$ {pricing.totalCost.toFixed(2)}</span>
            </div>
            {isBatch && (
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>Custo Unitário ({product.quantityInBatch} un):</span>
                <span>R$ {pricing.unitCost.toFixed(2)} / un</span>
              </div>
            )}
          </div>

          {/* Preços e Lucro */}
          <div className="col-span-6 space-y-2 pl-2">
            <div className="bg-emerald-50 border border-emerald-200 p-2 rounded text-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-emerald-800 block">Venda Balcão / Direta ({marginRow.marginLabel})</span>
                <span className="text-base font-black text-emerald-700">R$ {marginRow.directSalePrice.toFixed(2)}</span>
                {isBatch && <span className="text-[10px] text-emerald-600 block">(R$ {marginRow.directUnitSalePrice.toFixed(2)} / un)</span>}
              </div>
              <div className="text-right text-[11px] text-emerald-700 font-bold">
                <span>Lucro Líquido:</span>
                <span className="block text-xs text-emerald-800">+R$ {marginRow.directProfit.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 p-2 rounded text-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-orange-800 block">Preço Shopee (20% + R$ 4)</span>
                <span className="text-base font-black text-orange-700">R$ {(shopee?.salePrice || 0).toFixed(2)}</span>
                {isBatch && <span className="text-[10px] text-orange-600 block">(R$ {(shopee?.unitSalePrice || 0).toFixed(2)} / un)</span>}
              </div>
              <div className="text-right text-[11px] text-orange-700 font-bold">
                <span>Líquido Recebido:</span>
                <span className="block text-xs text-orange-800">+R$ {(shopee?.netProfit || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* CHECKLIST DE QUALIDADE & OBSERVAÇÕES MANUAIS */}
      <div className="grid grid-cols-12 gap-3">
        
        {/* Checklist */}
        <div className="col-span-5 border border-slate-300 rounded-lg p-3 space-y-1.5 text-[11px] text-slate-700">
          <span className="text-[9px] uppercase font-black text-slate-700 tracking-wider block border-b border-slate-200 pb-1">
            4. Checklist de Qualidade
          </span>
          <div className="space-y-1 pt-1 font-medium">
            <div className="flex items-center gap-1.5">[ &nbsp; ] Inspeção dimensional e visual</div>
            <div className="flex items-center gap-1.5">[ &nbsp; ] Remoção de suportes / rebarbas</div>
            <div className="flex items-center gap-1.5">[ &nbsp; ] Teste de encaixes / articulações</div>
            <div className="flex items-center gap-1.5">[ &nbsp; ] Limpeza e pós-processamento</div>
            <div className="flex items-center gap-1.5">[ &nbsp; ] Embalado com proteção e etiqueta</div>
          </div>
        </div>

        {/* Linhas para anotações manuais */}
        <div className="col-span-7 border border-slate-300 rounded-lg p-3 space-y-2">
          <span className="text-[9px] uppercase font-black text-slate-700 tracking-wider block border-b border-slate-200 pb-1">
            5. Anotações & Observações da Produção
          </span>
          <div className="space-y-2.5 pt-1">
            <div className="border-b border-slate-300 h-3"></div>
            <div className="border-b border-slate-300 h-3"></div>
            <div className="border-b border-slate-300 h-3"></div>
          </div>
        </div>

      </div>

      {/* RODAPÉ */}
      <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] text-slate-400">
        <span>Artgian Studio • Impressão 3D & Modelagem</span>
        <span>Documento gerado pelo 3DPrice Pro • {todayStr}</span>
        <span>Página 1 de 1</span>
      </div>

    </div>
  );
};
