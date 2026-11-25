import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [react(), tailwindcss()],
  build: mode === 'content' ? {
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    lib: {
      entry: fileURLToPath(new URL('./src/content/saramin.ts', import.meta.url)),
      name: 'BootdaSaramin',
      formats: ['iife'],
      fileName: () => 'saramin.js',
    },
  } : { outDir: 'dist', emptyOutDir: true },
}));
