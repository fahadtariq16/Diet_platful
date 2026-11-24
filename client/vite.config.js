import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During development the React app calls /api on the same origin,
    // and Vite forwards it to Express. This keeps the auth cookie simple.
    proxy: { '/api': 'http://localhost:4000' }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion']
        }
      }
    }
  }
});
