<script setup lang="ts">
import { RouterView } from 'vue-router'

import PWA from '@/features/pwa/PWA.vue'
</script>

<template>
	<header></header>

	<main>
		<RouterView />
		<PWA />
	</main>
</template>
