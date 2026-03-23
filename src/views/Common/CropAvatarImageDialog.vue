<template>
    <Dialog
        :visible="props.visible"
        modal
        :header="t('cropImageDialog.title')"
        :draggable="false"
        :style="{ width: 'calc(100% - 1rem)', maxWidth: '30rem' }"
        @update:visible="(visible) => emit('update:visible', visible)"
    >
        <div
            class="crop-image-dialog__image-preview max-h-88 w-full"
            :style="{
                '--translate-x': previewTranslateX + 'px',
                '--translate-y': previewTranslateY + 'px',
                '--rotate-deg': previewRotate + 'deg',
                '--scale': zoomLevel,
            }"
        >
            <img :src="previewObjectUrl" :alt="t('cropImageDialog.imageAlt')">
            <div class="crop-image-dialog__image-preview-overlay"></div>
        </div>

        <div class="flex items-center py-4 pl-9">
            <div class="flex items-center justify-center grow-1">
                <span class="pi pi-image" :style="{ '--p-icon-size': '0.75rem' }" aria-hidden="true" />
                <Slider v-model="zoomLevel" :aria-label="t('cropImageDialog.zoomLevel')" :min="1" :max="2" :step="0.01" class="w-30 mx-4" />
                <span class="pi pi-image" :style="{ '--p-icon-size': '1.25rem' }" aria-hidden="true" />
            </div>
            <Button
                v-tooltip.top="{ value: isTouchEventsDetected ? undefined : t('cropImageDialog.rotate') }"
                icon="pi pi-refresh"
                severity="secondary"
                variant="text"
                class="!w-8 !h-8"
                :aria-label="t('cropImageDialog.rotate')"
                @click="rotatePreview()"
            />
        </div>

        <template #footer>
            <button class="link self-center" role="button" tabindex="0" @click="resetPreview()">{{ t('cropImageDialog.resetLink') }}</button>
            <Button severity="secondary" class="ml-auto" @click="emit('update:visible', visible)">
                {{ t('cropImageDialog.cancelButton') }}
            </Button>
            <Button severity="primary" @click="apply()">
                {{ t('cropImageDialog.applyButton') }}
            </Button>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useApplication } from '@/composables/application'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Slider from 'primevue/slider'
import vTooltip from 'primevue/tooltip'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
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
    (e: 'apply', imageBlob: Blob): void
}>()

const { t } = useI18n()

const zoomLevel = ref<number>(1)
const previewTranslateX = ref<number>(0)
const previewTranslateY = ref<number>(0)
const previewRotate = ref<number>(0)

const previewObjectUrl = ref<string | undefined>()

watch(() => props.file, (file) => {
    if (previewObjectUrl.value) {
        URL.revokeObjectURL(previewObjectUrl.value)
        previewObjectUrl.value = undefined
    }
    if (file) {
        previewObjectUrl.value = URL.createObjectURL(new Blob([file]))
    } else {
        previewObjectUrl.value = undefined
    }
}, { immediate: true })

watch(() => props.visible, (visible, wasVisible) => {
    if (visible && !wasVisible) {
        resetPreview()
    }
})

function rotatePreview() {
    previewRotate.value += 90
    if (previewRotate.value >= 360) previewRotate.value -= 360
}

function resetPreview() {
    previewTranslateX.value = 0
    previewTranslateY.value = 0
    previewRotate.value = 0
    zoomLevel.value = 1
}

async function apply() {
    if (props.file && zoomLevel.value === 1 && previewTranslateX.value === 0 && previewTranslateY.value === 0 && previewRotate.value === 0) {
        emit('apply', new Blob([props.file], { type: props.file.type }))
    } else {
        try {
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image()
                image.onload = () => {
                    resolve(image)
                }
                image.onerror = reject
                image.src = previewObjectUrl.value!
            })

            const canvas = document.createElement('canvas')
            const minSizeDimension = Math.min(image.width, image.height)
            canvas.width = minSizeDimension
            canvas.height = minSizeDimension

            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Could not create a HTML canvas context.')

            ctx.translate(Math.floor(minSizeDimension / 2), Math.floor(minSizeDimension / 2))
            ctx.rotate(previewRotate.value * Math.PI / 180)
            ctx.scale(zoomLevel.value, zoomLevel.value)

            const sx = Math.floor((image.width - minSizeDimension) / 2)
            const sy = Math.floor((image.height - minSizeDimension) / 2)

            ctx.drawImage(
                image,
                sx, sy, minSizeDimension, minSizeDimension,
                Math.floor(-minSizeDimension / 2), Math.floor(-minSizeDimension / 2),
                minSizeDimension, minSizeDimension
            )

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob)
                    } else {
                        reject()
                    }
                }, 'image/jpeg', 95)
            })

            emit('apply', blob)
        } catch (error) {
            toast.add({ severity: 'error', summary: t('cropImageDialog.imageEditErrorToast'), life: 5000 })
        }
    }

    if (previewObjectUrl.value) {
        URL.revokeObjectURL(previewObjectUrl.value)
        previewObjectUrl.value = undefined
    }

    emit('update:visible', false)
}

</script>

<style lang="scss" scoped>
.crop-image-dialog__image-preview {
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
    aspect-ratio: 1;
    user-select: none;
    pointer-events: none;

    --translate-x: 0;
    --translate-y: 0;
    --rotate-deg: 0deg;
    --scale: 0;

    img {
        position: relative;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transform: translate(var(--translate-x), var(--translate-y)) rotate(var(--rotate-deg)) scale(var(--scale));
    }
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