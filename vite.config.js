import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path: GitHub Pages serves project sites from /<repo-name>/.
// The deploy workflow sets GH_PAGES=true; local dev/build stays at "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.GH_PAGES ? '/study-hall/' : '/',
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
