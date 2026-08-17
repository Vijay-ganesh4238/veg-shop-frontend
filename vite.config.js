import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // This tells Vite to allow your Localtunnel link through!
    allowedHosts: true,
  }
})