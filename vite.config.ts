import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
	plugins: [
		vue(),
		vueDevTools(),
		tailwindcss(),
		glsl({
			include: '**/*.glsl',
		}),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['brush-stroke-dry.png'],
			manifest: {
				name: 'Brushie',
				short_name: 'Brushie',
				start_url: '/',
				display: 'standalone',
				background_color: '#ffffff',
				theme_color: '#cc78cf',
				icons: [
					{
						src: '/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: '/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
					},
				],
			},
		}),
	],

	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
})
