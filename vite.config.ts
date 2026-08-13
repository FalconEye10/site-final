import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    global: 'globalThis',
    'process.env': {},
  },
  build: {
    target: ['es2020', 'safari14', 'chrome87', 'edge88', 'firefox78'],
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
