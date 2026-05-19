import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Avoid sandbox permission issues where config loading tries to walk up directories.
  // Setting an explicit root keeps resolution anchored to this folder.
  root: path.dirname(fileURLToPath(new URL(import.meta.url))),
  // Dev (http://localhost) should use absolute URLs so assets work on nested SPA routes.
  // Build (Electron loadFile/file://) should use relative URLs so assets resolve from index.html.
  // Vercel build should use absolute URLs so nested routes like /verify/:id can load assets.
  base: (command === 'build' && !process.env.VERCEL) ? './' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
}))
