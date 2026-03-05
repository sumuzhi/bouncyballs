import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // 相对路径，确保在根目录或子目录下都能加载
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
