import { defineConfig } from 'vite'
import path from 'path'
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // example folder is the project root
  root: path.resolve(__dirname),

  resolve: {
    alias: {
      // keep resolving the module import to the concrete source file
      'visiojs': path.resolve(__dirname, '../../package/src/visiojs.js'),
      // map the CSS import used in App.jsx to the source CSS file
      'visiojs/visiojs.css': path.resolve(__dirname, '../../package/src/visiojs.css'),
      // map any imports like 'visiojs/dist/...' to the package src folder
      'visiojs/dist': path.resolve(__dirname, '../../package/src')
    }
  },

  server: {
    fs: {
      // allow Vite to serve files from the example and the package source
      allow: [
        path.resolve(__dirname),                       // examples/circuit_react
        path.resolve(__dirname, '../../package/src'),  // package/src (module & css)
        path.resolve(__dirname, '../../package'),      // package/
        path.resolve(__dirname, '../../')              // repo root
      ]
    }
  },

  optimizeDeps: {
    // don't pre-bundle the local package so Vite loads the source file
    exclude: ['visiojs']
  }
})