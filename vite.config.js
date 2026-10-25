import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 可能部署在 /racketsense/ 这类子路径；相对 base 让资源与 data/ 都能找到。
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'public',
  server: {
    watch: {
      // 本地浏览器 profile / 测试产物放在 tmp/ 时不要让 Vite 去 watch（Windows 会 EBUSY）
      ignored: ['**/tmp/**', '**/node_modules/**', '**/dist/**'],
    },
  },
})
