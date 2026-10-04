import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { ProductImage, MAX_PRODUCT_IMAGES } from "../types/pricing";
import { productImageUrl, uploadProductImage } from "../services/productImages";

interface ProductImagesFieldProps {
  productId: string;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  /** Chamado a cada upload concluído, para o editor poder limpar arquivos órfãos se o usuário sair sem salvar. */
  onUploaded: (image: ProductImage) => void;
}

export const ProductImagesField: React.FC<ProductImagesFieldProps> = ({ productId, images, onChange, onUploaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Vagas já consideram os envios em andamento, para nunca passar do limite.
  const freeSlots = MAX_PRODUCT_IMAGES - images.length - uploading;

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    setError(null);
    const accepted = files.slice(0, Math.max(0, freeSlots));
    if (files.length > accepted.length) {
      setError(`Limite de ${MAX_PRODUCT_IMAGES} imagens por produto.`);
    }
    if (accepted.length === 0) return;

    setUploading(n => n + accepted.length);
    const uploaded: ProductImage[] = [];
    for (const file of accepted) {
      try {
        const image = await uploadProductImage(productId, file);
        uploaded.push(image);
        onUploaded(image);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao enviar a imagem.");
      } finally {
        setUploading(n => n - 1);
      }
    }
    if (uploaded.length > 0) onChange([...images, ...uploaded].slice(0, MAX_PRODUCT_IMAGES));
  };

  return (
    <div className="pt-2">
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        Fotos do Produto <span className="font-normal text-slate-400">({images.length}/{MAX_PRODUCT_IMAGES})</span>
      </label>

      <div className="grid grid-cols-3 gap-2">
        {images.map((image, index) => (
          <div key={image.key} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
            <img
              src={productImageUrl(image)}
              alt={`Foto ${index + 1} do produto`}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(images.filter(img => img.key !== image.key))}
              aria-label={`Remover foto ${index + 1}`}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`up-${i}`} className="aspect-square rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          </div>
        ))}

        {freeSlots > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors flex flex-col items-center justify-center gap-1 text-[11px] font-medium"
          >
            <ImagePlus className="w-5 h-5" />
            Adicionar
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="mt-1.5 text-[11px] text-red-600">{error}</p>}
      <p className="mt-1.5 text-[11px] text-slate-400">JPG, PNG ou WebP. As fotos são otimizadas automaticamente e salvas ao salvar o produto.</p>
    </div>
  );
};
