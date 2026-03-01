<template>
    <Dialog
        :visible="visible"
        modal
        :draggable="false"
        class="p-dialog-fullscreen-transparent !relative"
        @update:visible="emit('update:visible', visible)"
    >
        <template #container>
            <header class="photo-viewer__header">
                <div v-if="posterProfile" class="photo-viewer__profile" :class="{ 'photo-viewer__profile--hidden': zoomScale > 1 }">
                    <div class="w-10 h-10 mr-3 shrink-0">
                        <AuthenticatedImage :mxcUri="posterProfile.avatarUrl" type="thumbnail" :width="48" :height="48" method="scale">
                            <template v-slot="{ src }">
                                <Avatar :image="src" shape="circle" class="p-avatar-full" :aria-label="t('layout.userAvatarImage')" />
                            </template>
                            <template #error>
                                <Avatar icon="pi pi-user" shape="circle" class="p-avatar-full" :aria-label="t('layout.userAvatarImage')" />
                            </template>
                        </AuthenticatedImage>
                    </div>
                    <div class="flex flex-col text-nowrap justify-center">
                        <div class="text-(--text-strong) leading-4 relative">{{ posterDisplayName }}</div>
                        <div class="text-(--text-subtle) text-xs leading-4 mt-[2px] ml-1">{{ postDate }}</div>
                    </div>
                </div>
                <div class="flex">
                    <div class="photo-viewer__control-group">
                        <Button
                            v-tooltip.bottom="{ value: zoomScale > 1 ? t('photoViewer.zoomOutButton') : t('photoViewer.zoomInButton') }"
                            :icon="'pi ' + (zoomScale > 1 ? 'pi-search-minus' : 'pi-search-plus')"
                            severity="secondary"
                            :aria-label="zoomScale > 1 ? t('photoViewer.zoomOutButton') : t('photoViewer.zoomInButton')"
                            @click="toggleZoom()"
                        />
                        <Button
                            v-tooltip.bottom="{ value: t('photoViewer.downloadButton') }"
                            icon="pi pi-download"
                            severity="secondary"
                            :aria-label="t('photoViewer.downloadButton')"
                            @click="download()"
                        />
                    </div>
                    <Button
                        v-tooltip.bottom="{ value: t('photoViewer.closeButton') }"
                        icon="pi pi-times"
                        severity="secondary"
                        class="!w-10 !h-10"
                        :aria-label="t('photoViewer.closeButton')"
                        @click="emit('update:visible', false)"
                    />
                </div>
            </header>
            <div
                ref="viewerContainer"
                class="photo-viewer__viewer"
                :class="{
                    'photo-viewer__viewer--zoomed': zoomScale > 1,
                    'photo-viewer__viewer--zooming': isZooming,
                }"
                @touchstart="onTouchStart"
                @touchmove="onTouchMove"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
            >
                <AuthenticatedImage
                    :mxcUri="props.imageEvent?.content.url"
                    :encryptedFile="props.imageEvent?.content.file"
                    type="download"
                >
                    <template v-slot="{ src }">
                        <img
                            ref="previewImage"
                            :src="src"
                            :alt="props.imageEvent?.content.body"
                            class="photo-viewer__photo"
                            :style="{
                                '--image-zoomed-out-x-padding': imageZoomedOutXPadding + 'px',
                                '--image-zoomed-out-y-padding': imageZoomedOutYPadding + 'px',
                                'aspect-ratio': (props.imageEvent?.content.info?.w ?? 1) / (props.imageEvent?.content.info?.h ?? 1),
                                'transform': `translate(${zoomTranslateX}px, ${zoomTranslateY}px) scale(${zoomScale})`
                            }"
                            @dragstart="onDragStart"
                        >
                    </template>
                </AuthenticatedImage>
            </div>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { translateTouchEventToPointerEvents } from '@/utils/dom-event'

import { useApplication } from '@/composables/application'
import { useMediaCache } from '@/composables/media-cache'
import { useProfileStore } from '@/stores/profile'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'

import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import vTooltip from 'primevue/tooltip'
import { useToast } from 'primevue/usetoast'

import {
    type ApiV3SyncClientEventWithoutRoomId,
    type EncryptedFile,
    type EventImageContent,
} from '@/types'

const { t } = useI18n()
const toast = useToast()
const { isTouchEventsDetected } = useApplication()
const { profiles } = storeToRefs(useProfileStore())
const { getMxcObjectUrl } = useMediaCache()

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    imageEvent: {
        type: Object as PropType<ApiV3SyncClientEventWithoutRoomId<EventImageContent>>,
        default: undefined,
    },
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
}>()

watch(() => props.visible, (visible, wasVisible) => {
    if (visible && !wasVisible) {
        zoomScale.value = 1
        zoomTranslateX.value = 0
        zoomTranslateY.value = 0
        pointersDown = []
    }
})

const posterProfile = computed(() => {
    return profiles.value[props.imageEvent?.sender ?? '']
})

const posterDisplayName = computed(() => {
    return posterProfile.value?.displayname ?? props.imageEvent?.sender ?? ''
})

const postDate = computed(() => {
    return new Date(props.imageEvent?.originServerTs ?? 0).toLocaleString(undefined, {
        year: '2-digit', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
    })
})

async function download() {
    try {
        const file: EncryptedFile | string | undefined = props.imageEvent?.content.file ?? props.imageEvent?.content.url
        if (!file) {
            throw new Error('Missing file.')
        }

        const mimetype = props.imageEvent?.content.info?.mimetype

        const objectUrl = await getMxcObjectUrl(file!, { type: 'download', mimetype })

        const filename = props.imageEvent?.content.filename ?? props.imageEvent?.content.body ?? 'image'

        const a = document.createElement('a')
        a.href = objectUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()

        setTimeout(() => {
            a.remove()
        }, 100)
    } catch (error) {
        toast.add({ severity: 'error', summary: t('photoViewer.downloadError'), life: 3000 })
    } 
}

const imageZoomedOutYPadding = 192
const imageZoomedOutXPadding = 32

const viewerContainer = ref<HTMLDivElement>()
const previewImage = ref<HTMLImageElement>()
const zoomScale = ref<number>(1)
const isZooming = ref<boolean>(false)
const zoomTranslateX = ref<number>(0)
const zoomTranslateY = ref<number>(0)

function toggleZoom() {
    isZooming.value = true
    if (zoomScale.value > zoomScaleMin) {
        zoomScale.value = zoomScaleMin
        zoomTranslateX.value = 0
        zoomTranslateY.value = 0
    } else {
        zoomScale.value = zoomScaleMax
    }
    setTimeout(() => {
        isZooming.value = false
    }, 300)
}

interface TrackedPointer {
    pointerId: number;
    pageX: number;
    pageY: number;
    pageXDown: number;
    pageYDown: number;
    timestamp: number;
    isPrimary: boolean;
}

let viewContainerWidth: number = window.innerWidth
let viewContainerHeight: number = window.innerHeight
let imageBaseWidth = 400
let imageBaseHeight = window.innerHeight - imageZoomedOutYPadding

let averageXDown: number = 0
let averageYDown: number = 0
let zoomScaleDown: number = 1
let zoomScaleMin: number = 1
let zoomScaleMax: number = 2
let zoomFingerDistanceDown: number = 1
let zoomTranslateXDown: number = 0
let zoomTranslateYDown: number = 0
let pointersDown: TrackedPointer[] = []

function pointDistance(p1x: number, p1y: number, p2x: number, p2y: number) {
    const dx = p2x - p1x
    const dy = p2y - p1y
    return Math.hypot(dx, dy)
}

function onDragStart(event: DragEvent) {
    if (!props.visible) return

    event.preventDefault()
}

function onTouchStart(event: TouchEvent) {
    for (const pointerEvent of translateTouchEventToPointerEvents('pointerdown', event)) {
        onPointerDownHandle(pointerEvent)
    }
}

function onTouchMove(event: TouchEvent) {
    for (const pointerEvent of translateTouchEventToPointerEvents('pointermove', event)) {
        onPointerMoveHandle(pointerEvent)
    }
}

function onTouchEndViewer(event: TouchEvent) {
    for (const pointerEvent of translateTouchEventToPointerEvents('pointerup', event)) {
        onPointerUpHandle(pointerEvent)
    }
}

function onPointerDown(event: PointerEvent) {
    if (isTouchEventsDetected.value) return
    onPointerDownHandle(event)
}

function onPointerMove(event: PointerEvent) {
    if (isTouchEventsDetected.value) return
    onPointerMoveHandle(event)
}

function onPointerUpViewer(event: PointerEvent) {
    if (isTouchEventsDetected.value) return
    onPointerUpHandle(event)
}

function onPointerDownHandle(event: PointerEvent) {
    if (!props.visible) return

    event.preventDefault()
    event.stopPropagation()

    if (event.button === 0) {
        if (pointersDown.length === 0) {
            zoomTranslateXDown = zoomTranslateX.value
            zoomTranslateYDown = zoomTranslateY.value
        }
        pointersDown.push({
            pointerId: event.pointerId,
            pageX: event.pageX,
            pageY: event.pageY,
            pageXDown: event.pageX,
            pageYDown: event.pageY,
            timestamp: window.performance.now(),
            isPrimary: event.isPrimary,
        })
        if (pointersDown.length === 2) {
            zoomScaleDown = zoomScale.value
            zoomFingerDistanceDown = pointDistance(
                pointersDown[0]!.pageX,
                pointersDown[0]!.pageY,
                pointersDown[1]!.pageX,
                pointersDown[1]!.pageY,
            )
        }
    }

    averageXDown = 0
    averageYDown = 0
    for (const pointer of pointersDown) {
        averageXDown += pointer.pageXDown
        averageYDown += pointer.pageYDown
    }
    averageXDown /= pointersDown.length
    averageYDown /= pointersDown.length

    viewContainerWidth = window.innerWidth
    viewContainerHeight = window.innerHeight
    const imageRect = previewImage.value?.getBoundingClientRect()
    if (imageRect) {
        imageBaseHeight = Math.min(viewContainerHeight - imageZoomedOutYPadding, props.imageEvent?.content.info?.h ?? Infinity)
        imageBaseWidth = (imageRect.width / imageRect.height) * imageBaseHeight

        if (imageBaseWidth > viewContainerWidth - imageZoomedOutXPadding) {
            imageBaseWidth = Math.min(viewContainerWidth - imageZoomedOutXPadding, props.imageEvent?.content.info?.w ?? Infinity)
            imageBaseHeight = (imageRect.height / imageRect.width) * imageBaseWidth
        }
    }
}

function onPointerMoveHandle(event: PointerEvent) {
    if (!props.visible) return

    event.preventDefault()
    event.stopPropagation()

    const index = pointersDown.findIndex((pointer) => pointer.pointerId === event.pointerId)
    const pointer = pointersDown[index]
    if (!pointer) return
    pointer.pageX = event.pageX
    pointer.pageY = event.pageY

    let averageX: number = 0
    let averageY: number = 0
    for (const pointer of pointersDown) {
        averageX += pointer.pageX
        averageY += pointer.pageY
    }
    averageX /= pointersDown.length
    averageY /= pointersDown.length

    let translateXLimit = Math.floor(Math.max(0, ((imageBaseWidth * zoomScale.value) - viewContainerWidth) / 2))
    let translateYLimit = Math.floor(Math.max(0, ((imageBaseHeight * zoomScale.value) - viewContainerHeight) / 2))
    if (pointersDown.length > 1) {
        translateXLimit = Math.floor(Math.max(0, ((imageBaseWidth * zoomScaleMax) - viewContainerWidth) / 2))
        translateYLimit = Math.floor(Math.max(0, ((imageBaseHeight * zoomScaleMax) - viewContainerHeight) / 2))
    }

    zoomTranslateX.value = Math.max(-translateXLimit, Math.min(translateXLimit, zoomTranslateXDown + (averageX - averageXDown)))
    zoomTranslateY.value = Math.max(-translateYLimit, Math.min(translateYLimit, zoomTranslateYDown + (averageY - averageYDown)))
    
    if (pointersDown.length > 1) {
        zoomScale.value = Math.max(zoomScaleMin, Math.min(zoomScaleMax, zoomScaleDown * (pointDistance(
            pointersDown[0]!.pageX,
            pointersDown[0]!.pageY,
            pointersDown[1]!.pageX,
            pointersDown[1]!.pageY,
        ) / zoomFingerDistanceDown)))
    }
}

function onPointerUpHandle(event: PointerEvent) {
    const isImagePointer = (event.target as HTMLElement)?.tagName === 'IMG'
    if (!props.visible) return
    if (isImagePointer) {
        event.stopPropagation()
    }

    const index = pointersDown.findIndex((pointer) => pointer.pointerId === event.pointerId)
    const pointer = pointersDown[index]
    if (!pointer) return

    try {
        if (pointersDown.length === 2) {
            pointersDown = []
        } else if (pointersDown.length === 1) {
            // "Click"
            if (
                pointer.isPrimary
                && Math.abs(pointer.pageXDown - event.pageX) < 16
                && Math.abs(pointer.pageYDown - event.pageY) < 16
                && window.performance.now() - pointer.timestamp < 500
            ) {
                if (isImagePointer) {
                    toggleZoom()
                } else {
                    emit('update:visible', false)
                }
            }
        }
        if (pointersDown.length < 2) {
            const translateXLimit = Math.floor(Math.max(0, ((imageBaseWidth * zoomScale.value) - viewContainerWidth) / 2))
            const translateYLimit = Math.floor(Math.max(0, ((imageBaseHeight * zoomScale.value) - viewContainerHeight) / 2))
            if (Math.abs(zoomTranslateX.value) > translateXLimit || Math.abs(zoomTranslateY.value) > translateYLimit) {
                nextTick(() => {
                    setTimeout(() => {
                        zoomTranslateX.value = Math.max(-translateXLimit, Math.min(translateXLimit, zoomTranslateX.value))
                        zoomTranslateY.value = Math.max(-translateYLimit, Math.min(translateYLimit, zoomTranslateY.value))
                    }, 1)
                })
                
            }
        }
        isZooming.value = true
        setTimeout(() => {
            isZooming.value = false
        }, 300)
    } catch (error) { /* Ignore */ }

    if (index > -1) {
        pointersDown.splice(index, 1)
    }
}

function onWindowPointerLeave() {
    // pointersDown = []
}

onMounted(() => {
    window.addEventListener('pointerout', onWindowPointerLeave, true)
    window.addEventListener('pointerup', onPointerUpViewer, true)
    window.addEventListener('touchend', onTouchEndViewer, true)
})

onUnmounted(() => {
    window.removeEventListener('pointerout', onWindowPointerLeave, true)
    window.removeEventListener('pointerup', onPointerUpViewer, true)
    window.removeEventListener('touchend', onTouchEndViewer, true)


})
</script>

<style lang="scss" scoped>
.photo-viewer__header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 2.25rem 1.5rem 0 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 1;
}
.photo-viewer__profile {
    display: flex;
    opacity: 1;
    overflow: hidden;
    flex-shrink: 1;
    transition: opacity 0.2s;

    @media screen and (max-width: 350px) {
        opacity: 0;
    }
}
.photo-viewer__profile--hidden {
    opacity: 0;
}
.photo-viewer__viewer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
}
.photo-viewer__viewer--zoomed .photo-viewer__photo {
    cursor: zoom-out;
}
.photo-viewer__viewer--zooming .photo-viewer__photo {
    transition: transform 0.2s;
}
.photo-viewer__photo {
    max-height: calc(100dvh - var(--image-zoomed-out-y-padding, 12rem));
    max-width: calc(100dvw - var(--image-zoomed-out-x-padding, 2rem));
    user-select: none;
    cursor: zoom-in;
}

.photo-viewer__control-group {
    display: flex;
    gap: 0.25rem;
    padding: 0.1875rem;
    align-items: center;
    background: var(--background-surface-highest);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    height: 2.5rem;
    margin-right: 0.75rem;

    .p-button {
        --p-button-secondary-border-color: transparent;
        --p-button-secondary-hover-background: color-mix(in hsl, var(--background-mod-muted) 10%, var(--background-surface-highest) 90%);
        width: 2rem !important;
        height: 2rem !important;
    }
}

.p-button {
    --p-button-border-radius: var(--radius-md);
    --p-button-secondary-background: var(--background-surface-highest);
    --p-button-secondary-color: var(--interactive-text-default);
    --p-button-secondary-border-color: var(--border-subtle);
    --p-button-secondary-hover-background: color-mix(in hsl, var(--background-mod-muted) 10%, var(--background-surface-highest) 90%);
}
</style>