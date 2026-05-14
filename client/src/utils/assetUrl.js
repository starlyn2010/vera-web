export const assetUrl = (path) => {
    const base = import.meta.env?.BASE_URL ?? '/';
    const baseNormalized = base.endsWith('/') ? base : `${base}/`;
    const cleanPath = String(path ?? '').replace(/^\//, '');
    return `${baseNormalized}${cleanPath}`;
};

