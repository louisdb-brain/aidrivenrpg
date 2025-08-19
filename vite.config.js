import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    // Your app files live in /client
    root: 'client',
    base: './',

    resolve: {
        // Force every import to resolve to the SAME three package
        alias: {
            // Always resolve "three" from the root node_modules
            three: path.resolve(__dirname, 'node_modules/three'),
            // And pin the helper trees to that same package
            'three/addons': path.resolve(__dirname, 'node_modules/three/addons'),
            'three/examples/jsm': path.resolve(__dirname, 'node_modules/three/examples/jsm'),
        },
        dedupe: ['three'],
    },

    server: { port: 5173, open: true },

    // Build into /dist next to /client
    build: { outDir: '../dist', emptyOutDir: true },
});
