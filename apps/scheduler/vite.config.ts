import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.SCHEDULE_BASE_PATH || './',
  build: { target: 'es2022' },
  server: { port: 5173, strictPort: true },
});
