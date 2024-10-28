import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import postcssPresetMantine from 'postcss-preset-mantine';
import postcssSimpleVars from 'postcss-simple-vars';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // Maintain webpack's entry point behavior
  root: 'src',
  publicDir: '../public',

  build: {
    // Output to the same directory as webpack
    outDir: '../dist',
    emptyOutDir: true,

    // Configure asset handling
    assetsDir: 'assets',

    // Generate sourcemaps in development
    sourcemap: mode === 'development',

    // Configure rollup options
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html'),
      },
    },
  },

  // Server configuration (dev only)
  server: {
    port: 3000,
    open: true,
  },

  // Define environment variables
  define: {
    'window.API_BASE_URL': JSON.stringify(
      mode === 'production' ? '/api/v1' : 'http://localhost:8080/api/v1'
    ),
  },

  // CSS configuration
  css: {
    postcss: {
      plugins: [
        postcssPresetMantine(),
        postcssSimpleVars({
          variables: {
            'mantine-breakpoint-xs': '36em',
            'mantine-breakpoint-sm': '48em',
            'mantine-breakpoint-md': '62em',
            'mantine-breakpoint-lg': '75em',
            'mantine-breakpoint-xl': '88em',
          },
        }),
      ],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
