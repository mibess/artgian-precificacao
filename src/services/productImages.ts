import { ProductImage } from "../types/pricing";
import { getSupabase } from "./supabase";

/**
 * Imagens de produto no S3. O arquivo é redimensionado no navegador, enviado direto ao S3
 * por URL pré-assinada (emitida por /api/product-images) e lido pela URL pública do bucket/CDN.
 */

const API_URL = "/api/product-images";
const MAX_DIMENSION = 1600;
const OUTPUT_QUALITY = 0.85;

const baseUrl = ((import.meta.env.VITE_PRODUCT_IMAGES_BASE_URL as string | undefined) || "").replace(/\/+$/, "");

/** O envio só é oferecido quando a URL pública das imagens está configurada. */
export const isImageStorageConfigured = (): boolean => baseUrl.length > 0;

export function productImageUrl(image: ProductImage): string {
  return `${baseUrl}/${image.key}`;
}

/** Reduz proporcionalmente para caber em `max` pixels no maior lado, sem ampliar. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, OUTPUT_QUALITY));
}

/** Redimensiona e recodifica (WebP, com JPEG de reserva), reduzindo o tamanho de fotos de celular. */
async function prepareImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error("Formato não suportado. Use JPG, PNG ou WebP.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    const blob = (await canvasToBlob(canvas, "image/webp")) || (await canvasToBlob(canvas, "image/jpeg"));
    if (!blob) throw new Error("Não foi possível processar a imagem.");
    return blob;
  } finally {
    bitmap.close();
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = (await getSupabase()?.auth.getSession()) ?? { data: null };
  const token = data?.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error || fallback;
}

export async function uploadProductImage(productId: string, file: File): Promise<ProductImage> {
  const blob = await prepareImage(file);

  const presign = await fetch(API_URL, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ productId, contentType: blob.type, size: blob.size })
  });
  if (!presign.ok) throw new Error(await errorMessage(presign, "Falha ao preparar o envio da imagem."));
  const { key, uploadUrl, headers } = await presign.json();

  const put = await fetch(uploadUrl, { method: "PUT", headers, body: blob });
  if (!put.ok) throw new Error("O S3 recusou o envio da imagem. Verifique o CORS do bucket.");

  return { key };
}

/** Remoção best-effort: uma falha aqui deixa um arquivo órfão no bucket, nunca quebra o fluxo do usuário. */
export async function deleteProductImages(images: ProductImage[]): Promise<void> {
  if (images.length === 0) return;
  try {
    const headers = await authHeaders();
    await Promise.all(images.map(img =>
      fetch(API_URL, { method: "DELETE", headers, body: JSON.stringify({ key: img.key }) })
        .catch(err => console.warn("[Imagens] Falha ao remover do S3:", img.key, err))
    ));
  } catch (err) {
    console.warn("[Imagens] Falha ao remover imagens:", err);
  }
}
