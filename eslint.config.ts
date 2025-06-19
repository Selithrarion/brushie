import pluginVitest from '@vitest/eslint-plugin'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import { globalIgnores } from 'eslint/config'
import pluginCypress from 'eslint-plugin-cypress/flat'
import pluginImport from 'eslint-plugin-import'
import pluginOxlint from 'eslint-plugin-oxlint'
import pluginPrettier from 'eslint-plugin-prettier/recommended'
import pluginVue from 'eslint-plugin-vue'

export default defineConfigWithVueTs(
	{
		name: 'app/files-to-lint',
		files: ['**/*.{ts,mts,tsx,vue}'],
	},

	globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

	pluginVue.configs['flat/essential'],
	vueTsConfigs.recommended,

	{
		...pluginVitest.configs.recommended,
		files: ['src/**/__tests__/*'],
	},

	{
		...pluginCypress.configs.recommended,
		files: ['cypress/e2e/**/*.{cy,spec}.{js,ts,jsx,tsx}', 'cypress/support/**/*.{js,ts,jsx,tsx}'],
	},
	...pluginOxlint.configs['flat/recommended'],
	skipFormatting,

	pluginImport.flatConfigs.recommended,
	pluginPrettier,

	{
		settings: {
			'import/resolver': {
				typescript: {
					alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
					bun: true, // resolve Bun modules https://github.com/import-js/eslint-import-resolver-typescript#bun
					project: './tsconfig.json',
					node: {
						extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
					},
				},
			},
		},
	},

	{
		rules: {
			'prettier/prettier': 'warn',

			'no-unresolved': 0,

			'import/named': 'off',
			'import/namespace': 'off',
			'import/default': 'off',
			'import/no-named-as-default': 'off',
			'import/no-named-as-default-member': 'off',

			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],

			'import/order': [
				'warn',
				{
					'alphabetize': { order: 'asc', caseInsensitive: true },
					'newlines-between': 'always',
					'pathGroups': ['@pages/**', '@widgets/**', '@features/**', '@entities/**', '@shared/**'].map((pattern) => ({
						pattern,
						group: 'internal',
						position: 'after',
					})),
					'pathGroupsExcludedImportTypes': ['builtin'],
					'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
				},
			],
		},
	},
)
