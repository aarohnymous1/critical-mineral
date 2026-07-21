import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this repo from /critical-mineral/, so assets need that
// prefix in production. Local dev stays at the root.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/critical-mineral/' : '/',
  plugins: [react()],
})
