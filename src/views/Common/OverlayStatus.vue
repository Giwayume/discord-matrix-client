<template>
    <div class="p-overlaystatus" :class="['p-overlaystatus--' + props.status, 'p-overlaystatus--' + props.level]">
        <slot />
        <div class="p-overlaystatus-indicator"></div>
    </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'

const props = defineProps({
    status: {
        type: String as PropType<'online' | 'offline' | 'unavailable'>,
        default: 'offline',
    },
    level: {
        type: String as PropType<'low' | 'lower' | 'lowest'>,
        default: 'lowest',
    },
})

</script>