import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/widget'),
  base: '/widget/',
  build: {
    outDir: path.resolve(__dirname, 'dist/widget'),
    emptyOutDir: true,
  },
});
