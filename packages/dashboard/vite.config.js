 
  import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    base: './', 

  plugins: [react(),
     tailwindcss(),
  ],
  build: {
        manifest: true,
        // Output directory for the production build
        outDir: '../extension/dashboard',
        // Empty the output directory before building
        emptyOutDir: true,
      }
})
