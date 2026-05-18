import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Copy the user's GLB model to the public folder root so Vite can serve it
const publicRoot = path.resolve(__dirname, 'public')
if (!fs.existsSync(publicRoot)) {
  fs.mkdirSync(publicRoot, { recursive: true })
}

const srcModel = path.resolve(__dirname, '../1st art work.glb')
try {
  if (fs.existsSync(srcModel)) {
    fs.copyFileSync(srcModel, path.resolve(publicRoot, '1st art work.glb'))
  }
} catch (e) {
  console.error("Failed to copy 1st art work.glb:", e)
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animation
          'vendor-motion': ['framer-motion'],
          // Three.js core
          'vendor-three': ['three'],
          // React Three Fiber + Drei
          'vendor-r3f': ['@react-three/fiber', '@react-three/drei'],
        }
      }
    }
  }
})
