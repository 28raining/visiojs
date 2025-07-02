import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    // Specify the output format for your library (e.g., `es`, `cjs`, `umd`)
    lib: {
      entry: './src/visiojs.js',
      name: 'visiojs',
      // fileName: 'visiojs',
      formats: ['es', 'umd', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'visiojs.js';
        if (format === 'umd') return 'visiojs.umd.js';
        if (format === 'cjs') return 'visiojs.umd.cjs';
        return `visiojs.${format}.js`;
      },
    }
  },
});
