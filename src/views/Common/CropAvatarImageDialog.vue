<template>
    <Dialog
        :visible="props.visible"
        modal
        :header="t('cropImageDialog.title')"
        :draggable="false"
        :style="{ width: 'calc(100% - 1rem)', maxWidth: '30rem' }"
        @update:visible="(visible) => emit('update:visible', visible)"
    >
        <div class="crop-image-dialog__image-preview max-h-88 w-full">
            <img src="" :alt="t('cropImageDialog.imageAlt')">
            <div class="crop-image-dialog__image-preview-overlay"></div>
        </div>

        <div class="flex items-center py-4 pl-9">
            <div class="flex items-center justify-center grow-1">
                <span class="pi pi-image" :style="{ '--p-icon-size': '0.75rem' }" aria-hidden="true" />
                <Slider v-model="zoomLevel" :aria-label="t('cropImageDialog.zoomLevel')" :min="1" :max="2" :step="0.01" class="w-30 mx-4" />
                <span class="pi pi-image" :style="{ '--p-icon-size': '1.25rem' }" aria-hidden="true" />
            </div>
            <Button v-tooltip.top="{ value: isTouchEventsDetected ? undefined : t('cropImageDialog.rotate') }" icon="pi pi-refresh" severity="secondary" variant="text" :aria-label="t('cropImageDialog.rotate')" />
        </div>

        <template #footer>
            <a href="javascript:void" class="self-center">{{ t('cropImageDialog.resetLink') }}</a>
            <Button severity="secondary" class="ml-auto" @click="emit('update:visible', visible)">
                {{ t('cropImageDialog.cancelButton') }}
            </Button>
            <Button severity="primary" @click="apply">
                {{ t('cropImageDialog.applyButton') }}
            </Button>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useApplication } from '@/composables/application'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Slider from 'primevue/slider'
import vTooltip from 'primevue/tooltip'

const { isTouchEventsDetected } = useApplication()

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    file: {
        type: File,
        default: undefined,
    }
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
    (e: 'apply'): void
}>()

const { t } = useI18n()

const zoomLevel = ref<number>(1)

function apply() {
    emit('apply')
    emit('update:visible', false)
}

</script>

<style lang="scss" scoped>
.crop-image-dialog__image-preview {
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
    aspect-ratio: 1;
}
.crop-image-dialog__image-preview-overlay {
    border: 5px solid var(--white);
    box-shadow: 0 0 0 9999px rgba(47,49,54,.6);
    box-sizing: border-box;
    pointer-events: none;
    position: absolute;
    border-radius: 50%;
    top: 1rem;
    bottom: 1rem;
    left: 50%;
    aspect-ratio: 1;
    z-index: 1;
    max-width: calc(100% - 2rem);
    transform: translateX(-50%);
}
</style>