/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Gateway chưa bật CORS và cũng không cần: trình duyệt luôn gọi CÙNG origin với trang web.
// Ở dev, Vite chuyển tiếp /api sang gateway; ở production, nginx làm việc đó (xem nginx.conf).
const gateway = process.env.GATEWAY_URL ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: gateway, changeOrigin: true },
    },
  },
  build: {
    sourcemap: false, // không public source map lên production
    chunkSizeWarningLimit: 900,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
