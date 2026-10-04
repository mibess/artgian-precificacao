import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Backend das imagens de produto (Vercel Function; em `npm run dev` o mesmo handler roda via plugin do Vite).
 * O navegador nunca recebe credenciais da AWS: ele pede uma URL pré-assinada de upload (POST) e
 * envia o arquivo direto ao S3. Toda chamada exige o token de sessão do Supabase e só permite
 * mexer em chaves dentro de `products/<id-do-usuário>/`.
 *
 * Variáveis de ambiente (servidor): S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
 * (O prefixo S3_ evita colidir com as variáveis AWS_* reservadas pela Vercel.)
 */

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};
const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 120;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let s3: S3Client | null = null;
function getS3(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ""
      }
    });
  }
  return s3;
}

function isStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET && process.env.S3_REGION &&
    process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
  );
}

/** Valida o token de sessão no Supabase e devolve o id do usuário (ou null). */
async function authenticate(request: Request): Promise<string | null> {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return null;

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  return typeof user?.id === "string" ? user.id : null;
}

const SAFE_SEGMENT = /^[A-Za-z0-9_-]{1,80}$/;

/** POST { productId, contentType, size } -> { key, uploadUrl, headers } */
export async function POST(request: Request): Promise<Response> {
  if (!isStorageConfigured()) return json({ error: "Armazenamento S3 não configurado no servidor." }, 503);
  const userId = await authenticate(request);
  if (!userId) return json({ error: "Não autenticado." }, 401);

  const body = await request.json().catch(() => null);
  const productId = body?.productId;
  const contentType = body?.contentType;
  const size = Number(body?.size);

  if (typeof productId !== "string" || !SAFE_SEGMENT.test(productId)) return json({ error: "Produto inválido." }, 400);
  if (typeof contentType !== "string" || !ALLOWED_TYPES[contentType]) return json({ error: "Formato não suportado (use JPG, PNG ou WebP)." }, 400);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return json({ error: "Imagem acima de 5 MB." }, 400);

  const key = `products/${userId}/${productId}/${crypto.randomUUID()}.${ALLOWED_TYPES[contentType]}`;
  const uploadUrl = await getSignedUrl(
    getS3(),
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      CacheControl: CACHE_CONTROL
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS }
  );

  return json({ key, uploadUrl, headers: { "Content-Type": contentType, "Cache-Control": CACHE_CONTROL } });
}

/** DELETE { key } -> 204 (somente chaves do próprio usuário) */
export async function DELETE(request: Request): Promise<Response> {
  if (!isStorageConfigured()) return json({ error: "Armazenamento S3 não configurado no servidor." }, 503);
  const userId = await authenticate(request);
  if (!userId) return json({ error: "Não autenticado." }, 401);

  const body = await request.json().catch(() => null);
  const key = body?.key;
  if (typeof key !== "string" || !key.startsWith(`products/${userId}/`) || key.includes("..")) {
    return json({ error: "Chave inválida." }, 403);
  }

  await getS3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  return new Response(null, { status: 204 });
}
