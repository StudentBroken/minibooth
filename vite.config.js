import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Use relative base so assets load correctly on GitHub Pages (e.g. https://<user>.github.io/<repo>/)
  base: './',
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
    sourcemap: false
  }
});
