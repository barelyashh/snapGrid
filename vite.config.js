import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000, // Choose your preferred port
  },
  proxy: {
    '/api': {
      target: 'http://localhost:3030', // Your Express server
      changeOrigin: true,
    },
  },
  build: {
    outDir: 'dist', // Output directory for production build
  },
});
