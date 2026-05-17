# Guía de Despliegue en Vercel - Clear Path (Jud)

Este repositorio es un monorepo (Vite + FastAPI) y puede desplegarse en Vercel de dos formas:

1) **Deploy completo (recomendado)**: Frontend + backend serverless en Vercel (`/api`).
2) **Solo frontend**: Útil para revisión UX/UI sin backend (root directory `client/`).

## Opción A (recomendado): Deploy completo (frontend + /api)

### Requisitos
- Existe `vercel.json` en la raíz del repo (build y rewrites).
- El backend se expone como Function en `api/index.py`, que exporta `app` (FastAPI).

### Pasos en Vercel (Dashboard)
1. Importa el repositorio en Vercel (**Add New → Project**).
2. En **Root Directory**, selecciona la **raíz del repo** (no `client/`).
3. Deja que Vercel use la configuración del repo:
   - **Build Command**: `npm run build:vercel`
   - **Output Directory**: `client/dist`
4. (Opcional) Variables de entorno:
   - `GROQ_API_KEY` (si quieres habilitar el chatbot en producción)
5. Deploy.

### Qué esperar
- La SPA corre en `/`
- El backend (FastAPI) corre en `/api/*` (por ejemplo `/api/health`)
- En Vercel se usa `database/static_demo.db` si existe (modo solo lectura)

## Opción B: Solo frontend (sin /api)

1. Importa el repo en Vercel.
2. En **Root Directory**, selecciona `client/`.
3. Configura:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy.

## Notas importantes
- Si el frontend llama a endpoints reales, el modo “solo frontend” fallará a menos que uses mocks o apuntes a una API pública.
