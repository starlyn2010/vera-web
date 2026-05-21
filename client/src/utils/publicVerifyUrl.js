// Public URL helpers for QR codes.
// - Prefer an explicit Vite env var when you need QR to point to a specific domain.
// - Otherwise, fall back to the current origin (works on Vercel/custom domains).

const normalizeBaseUrl = (value) => {
  const base = typeof value === 'string' ? value.trim() : '';
  if (!base) return '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

export const getPublicBaseUrl = () => {
  const envBase = normalizeBaseUrl(import.meta?.env?.VITE_PUBLIC_BASE_URL);
  if (envBase) return envBase;

  const origin = typeof window !== 'undefined' ? window.location?.origin : '';
  
  // When running from Electron (file://) or if origin is missing/null, fallback to the production web domain
  if (!origin || origin === 'null' || origin.startsWith('file://')) {
    return 'https://jud-starlyn2010s-projects.vercel.app';
  }
  
  return origin;
};

export const getVerifyUrl = (id) => {
  const safeId = encodeURIComponent(String(id ?? '').trim() || 'preview');
  let base = getPublicBaseUrl();
  
  // Si la base no tiene protocolo, es una ruta relativa y el scanner fallará.
  // Forzamos el dominio de producción si detectamos que estamos en un entorno sin dominio claro.
  if (!base || base.startsWith('/') || base === 'null') {
    base = 'https://jud-starlyn2010s-projects.vercel.app';
  }
  
  return `${base}/verify/${safeId}`;
};

