<script setup lang="ts"></script>

<template>
    <router-view />
    <Toast />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useApplication } from '@/composables/application'

import Toast from 'primevue/toast'

const { isTouchEventsDetected } = useApplication()

onMounted(() => {
    if (window.matchMedia("(pointer: coarse)").matches && import.meta.env.DEV) {
        import('eruda').then((eruda) => { eruda.init() })
    }

    window.addEventListener('touchstart', onTouchDetected, true)
})

function onTouchDetected() {
    isTouchEventsDetected.value = true
    window.removeEventListener('touchstart', onTouchDetected, true)
}

</script>

<style scoped></style>
