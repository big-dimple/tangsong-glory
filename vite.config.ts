import { defineConfig } from 'vite';
import { collectBuildInfo } from './scripts/build-info';

const buildInfo = collectBuildInfo(process.cwd(), new Date().toISOString());

export default defineConfig({
  base: '/',
  server: {
    port: 5173,
    strictPort: true,
  },
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo),
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 3000,
  },
  plugins: [
    {
      name: 'tangsong-glory-build-info',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'build-info.json',
          source: JSON.stringify(buildInfo, null, 2) + '\n',
        });
      },
    },
  ],
});
