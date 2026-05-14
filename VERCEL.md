# 🚀 Guía de Despliegue en Vercel - Clear Path (Jud)

Esta guía explica cómo publicar la interfaz web de Clear Path en Vercel para que tus compañeros puedan ver el diseño y la funcionalidad del frontend, incluso siendo una aplicación de escritorio.

## Pasos para el Despliegue

### 1. Preparar el Repositorio
Asegúrate de que los cambios actuales (incluyendo `client/vercel.json`) estén subidos a tu repositorio de GitHub.

### 2. Importar en Vercel
1. Ve a [vercel.com](https://vercel.com) e inicia sesión.
2. Haz clic en **"Add New"** > **"Project"**.
3. Selecciona tu repositorio de Clear Path.
4. En la configuración del proyecto:
   - **Root Directory**: Selecciona la carpeta `client`.
   - **Framework Preset**: Vite.
   - **Build Command**: `npm run build`.
   - **Output Directory**: `dist`.

### 3. Variables de Entorno (Opcional)
Si el frontend necesita conectarse a una API externa o tiene configuraciones específicas, añádelas en la sección **"Environment Variables"** de Vercel.

### 4. Desplegar
Haz clic en **"Deploy"**. En unos minutos, tendrás una URL pública (ej. `clear-path-jud.vercel.app`) que podrás compartir.

---

## ⚠️ Notas Importantes
- **Backend Local**: Como es una app de escritorio, el backend de Python corre localmente. La versión de Vercel mostrará la interfaz, pero las llamadas a la API fallarán a menos que se configure un backend en la nube o se usen datos de prueba (mocks).
- **Solo Frontend**: Este despliegue es ideal para revisiones de diseño (UX/UI) y flujo de navegación.

---

## 💡 Sugerencia para el Equipo
Si quieren ver cómo funciona con datos reales sin instalar Python, podemos configurar un **Mock Service Worker (MSW)** o un backend simple en Vercel Functions para simular las respuestas de la base de datos.
