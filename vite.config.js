import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: 'client',
    base: './',

    resolve: {
        alias: {
            three: path.resolve(__dirname, 'node_modules/three'),
            'three/examples/jsm': path.resolve(__dirname, 'node_modules/three/examples/jsm'),
            // keep this alias anyway; it won't be used since you have no addons folder
            'three/addons': path.resolve(__dirname, 'node_modules/three/addons'),
        },
        dedupe: ['three'],
    },

    server: { port: 5173, open: true },
    build: { outDir: '../dist', emptyOutDir: true },
});
