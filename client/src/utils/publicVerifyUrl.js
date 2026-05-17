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
  // When running from file:// (e.g., Electron), origin can be "null".
  if (!origin || origin === 'null') return '';
  return origin;
};

export const getVerifyUrl = (id) => {
  const safeId = encodeURIComponent(String(id ?? '').trim() || 'preview');
  const base = getPublicBaseUrl();
  // If we couldn't infer a base (e.g., Electron file://), keep it relative.
  if (!base) return `/verify/${safeId}`;
  return `${base}/verify/${safeId}`;
};

