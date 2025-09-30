// File: packages/extension/vite.config.js

import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    // Set this to false to prevent Vite from clearing the console.
    clearScreen: false,
    // Our output directory is 'dist'
    outDir: 'dist',
    // We are building a library, not a web app
    lib: {
      // The entry point for our service worker
      entry: 'service-worker.js',
      // The output format is 'es' (ECMAScript module)
      formats: ['es'],
      // The name of the output file - THIS IS THE FIX
      fileName: () => 'service-worker.js',
    },
    // Minification is not needed for extensions, and it makes debugging harder.
    minify: false,
    // Sourcemaps are helpful for debugging.
    sourcemap: 'inline',
  },
});