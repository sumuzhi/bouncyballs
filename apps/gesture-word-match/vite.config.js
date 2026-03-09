import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function copyMediapipeWasm() {
  const sourceDir = path.resolve(
    process.cwd(),
    'node_modules/@mediapipe/tasks-vision/wasm',
  );
  const targetDir = path.resolve(process.cwd(), 'public/mediapipe');
  if (!fs.existsSync(sourceDir)) {
    return;
  }
  fs.mkdirSync(targetDir, { recursive: true });
  const files = [
    'vision_wasm_internal.js',
    'vision_wasm_internal.wasm',
    'vision_wasm_nosimd_internal.js',
    'vision_wasm_nosimd_internal.wasm',
  ];
  files.forEach((fileName) => {
    const source = path.join(sourceDir, fileName);
    const target = path.join(targetDir, fileName);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
    }
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  copyMediapipeWasm();
  return {
    plugins: [react()],
    base:
      env.VITE_PUBLIC_BASE ||
      (mode === 'production' ? '/gesture-word-match/' : '/'),
    server: {
      port: 3004,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
