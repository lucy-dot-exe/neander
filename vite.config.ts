/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Monaco and Blockly are large by nature; they are split into their own chunks below.
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/monaco-editor')) return 'monaco';
          if (id.includes('node_modules/blockly')) return 'blockly';
        }
      }
    }
  },
  test: {
    include: ['src/**/*.test.ts']
  }
});
