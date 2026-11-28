import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Bản build một file (iife) dùng cho scripts/make-single.mjs
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist-single', emptyOutDir: true, cssCodeSplit: false, assetsInlineLimit: 100000000,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app.[ext]' } },
  },
});
