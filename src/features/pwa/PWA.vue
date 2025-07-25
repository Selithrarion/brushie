<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

import UiButton from '@/shared/ui/UiButton.vue'

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW()

function close() {
	offlineReady.value = false
	needRefresh.value = false
}
</script>

<template>
	<transition name="fade-scale">
		<div
			v-if="offlineReady || needRefresh"
			class="fixed bottom-4 left-1/2 z-50 flex w-fit -translate-x-1/2 flex-col rounded-xl border border-white/30 bg-white/20 px-4 py-3 shadow-lg backdrop-blur-md"
		>
			<div class="mb-2 text-center text-sm">
				<span v-if="offlineReady"> App ready to work offline </span>
				<span v-else> New content available. Please reload </span>
			</div>

			<div class="flex justify-center gap-2">
				<UiButton v-if="needRefresh" button-class="!px-3 !py-1 !text-xs" @click="updateServiceWorker()"> Reload </UiButton>
				<UiButton button-class="!px-3 !py-1 !text-xs" @click="close"> Close </UiButton>
			</div>
		</div>
	</transition>
</template>
