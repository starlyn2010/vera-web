import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Dev (http://localhost) should use absolute URLs so assets work on nested SPA routes.
  // Build (Electron loadFile/file://) should use relative URLs so assets resolve from index.html.
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
}))
