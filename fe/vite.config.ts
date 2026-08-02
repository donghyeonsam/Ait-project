/// <reference types="vitest/config" />

import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react(), tailwindcss()],
    // sockjs-client가 참조하는 Node의 global을 브라우저 환경에 맞춰 준다.
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      clearMocks: true,
    },
    server: {
      proxy: {
        '/backend': {
          target: env.VITE_BE_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/backend/, ''),
        },
        '/ai-evaluate': {
          target: env.VITE_AI_EVALUATE_PROXY_TARGET || 'http://localhost:8100',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ai-evaluate/, ''),
        },
      },
    },
  }
})
