import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false, // If your backend uses self-signed certificates
        // Optionally, rewrite the path if needed
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/auth': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false, // If your backend uses spelf-signed certificates
      },
    },
    // comment proxy in production
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
