import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // File sumber mentah (Excel/gambar) di root sering sedang dibuka aplikasi lain dan
    // terkunci (EBUSY) — jangan dipantau supaya dev server tidak crash.
    watch: { ignored: ['**/*.xlsx', '**/*.xls', '**/*.csv'] },
  },
})
