<script setup lang="ts"></script>

<template>
    <router-view />
    <Toast />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import Toast from 'primevue/toast'

onMounted(() => {
    if (window.matchMedia("(pointer: coarse)").matches && import.meta.env.DEV) {
        import('eruda').then((eruda) => { eruda.init() })
    }
})

</script>

<style scoped></style>
