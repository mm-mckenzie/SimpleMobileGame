import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: true, // expose on LAN so you can test on physical phone
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
