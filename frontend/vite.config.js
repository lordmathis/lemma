import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import postcssPresetMantine from 'postcss-preset-mantine';
import postcssSimpleVars from 'postcss-simple-vars';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      include: ['**/*.jsx', '**/*.js'],
    }),
  ],

  root: 'src',
  publicDir: '../public',

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: mode === 'development',

    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html'),
      },
      output: {
        manualChunks: {
          // React core libraries
          'react-core': ['react', 'react-dom'],

          // Mantine UI components and related
          mantine: [
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/modals',
            '@mantine/notifications',
          ],

          // Editor related packages
          editor: [
            'codemirror',
            '@codemirror/commands',
            '@codemirror/lang-markdown',
            '@codemirror/state',
            '@codemirror/theme-one-dark',
            '@codemirror/view',
          ],

          // Markdown processing
          markdown: [
            'react-markdown',
            'react-syntax-highlighter',
            'rehype-katex',
            'remark-math',
            'katex',
          ],

          // Icons and utilities
          utils: [
            '@tabler/icons-react',
            '@react-hook/resize-observer',
            'react-arborist',
          ],
        },
        // Optimize chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          if (name === 'react-core') return 'assets/react.[hash].js';
          if (name === 'mantine') return 'assets/mantine.[hash].js';
          if (name === 'editor') return 'assets/editor.[hash].js';
          if (name === 'markdown') return 'assets/markdown.[hash].js';
          if (name === 'utils') return 'assets/utils.[hash].js';
          return 'assets/[name].[hash].js';
        },
        // Optimize asset naming
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },

  server: {
    port: 3000,
    open: true,
  },

  define: {
    'window.API_BASE_URL': JSON.stringify(
      mode === 'production' ? '/api/v1' : 'http://localhost:8080/api/v1'
    ),
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
      },
    },
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
    extensions: ['.js', '.jsx', '.json'],
  },

  // Add performance optimization options
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mantine/core',
      '@mantine/hooks',
      'codemirror',
      'react-markdown',
    ],
  },
}));
