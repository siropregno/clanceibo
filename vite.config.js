import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/clanceibo/', // Asegúrate de que coincida con el nombre del repositorio
  plugins: [react()],
});
