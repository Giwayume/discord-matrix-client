<template>
    <div class="p-overlaystatus" :class="[
        'p-overlaystatus--' + props.status,
        'p-overlaystatus--' + props.level,
        'p-overlaystatus--' + props.size,
    ]">
        <slot />
        <div v-show="!invisible" class="p-overlaystatus-indicator"></div>
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
    size: {
        type: String as PropType<'small' | 'medium'>,
        default: 'medium',
    },
    invisible: {
        type: Boolean,
        default: false,
    }
})

</script>