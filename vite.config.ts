import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/vodozemac-wasm-bindings/vodozemac_bg.wasm',
                    dest: 'assets/wasm'
                }
            ]
        }),
        wasm(),
        topLevelAwait(),
        vue(),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        port: 5173,
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
    },
    assetsInclude: ['**/*.wasm'],
})
