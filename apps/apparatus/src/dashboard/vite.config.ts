import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  base: '/dashboard/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@atlascrew/apparatus-lib': path.resolve(__dirname, '../../../../libs/client/src/index.ts'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/dashboard/assets/diagrams': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
      '/api/docs-index': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
      '/events': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../dist-dashboard'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
        },
      },
    },
  },
});
