import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/clanceibo/', // Cambia esto al nombre de tu repositorio
  plugins: [react()],
});
