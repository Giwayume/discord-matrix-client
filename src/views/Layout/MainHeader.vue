<template>
    <header class="application__main__header">
        <div class="application__main__header-container">
            <Button
                v-if="isMobileView"
                icon="pi pi-arrow-left"
                severity="secondary"
                variant="text"
                class="!p-0 !w-10 !h-10 !ml-1"
                :style="{ '--p-icon-size': '1.25rem' }"
                :aria-label="t('layout.sidebarMenuButton')"
                @click="toggleApplicationSidebar()"
            />
            <slot />
        </div>
    </header>
</template>

<script setup lang="ts">
import { inject, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useApplication } from '@/composables/application'

import Button from 'primevue/button'

const { isMobileView, toggleApplicationSidebar } = useApplication()

const { t } = useI18n()

const emit = defineEmits<{
    (e: 'toggleMenu'): void
}>()

const isTouchScreen = window.matchMedia("(pointer: coarse)").matches

</script>

<style lang="scss" scoped>
.application__main__header {
    display: flex;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: transparent;
    border-bottom: 1px solid var(--border-subtle);
    border-start-start-radius: var(--radius-md);
    padding: 0;
    margin: 0;
    height: 3rem;
    z-index: 2;
}
.application__main__header-container {
    display: flex;
    flex-grow: 1;
    align-items: center;
    overflow: hidden;
}
</style>