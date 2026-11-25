import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'wxt';
import manifest from './extension/public/manifest.json';

const { manifest_version, ...manifestFields } = manifest;

export default defineConfig({
  srcDir: 'extension/src',
  outDir: 'extension/dist',
  manifestVersion: manifest_version as 3,
  manifest: manifestFields,
  vite: () => ({ plugins: [react(), tailwindcss()] }),
});
