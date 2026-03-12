<template>
    <Dialog
        :visible="props.visible"
        modal
        :draggable="false"
        :style="{
            width: 'calc(100% - 1rem)',
            maxWidth: '30rem',
        }"
        @update:visible="emit('update:visible', $event)"
    >
        <template #header>
            <div class="flex flex-col">
                <div class="p-dialog-title">{{ t('deleteMessageConfirm.title') }}</div>
                <p class="text-(--text-subtle) mt-1">{{ t('deleteMessageConfirm.content') }}</p>
            </div>
        </template>
        <div class="delete-message-confirm__message-preview">
            <TimelineEventRender v-if="eventRenderInfoWithHeader" :room="props.room" :e="eventRenderInfoWithHeader" :i18nText="i18nText" />
        </div>
        <template v-if="!isTouchEventsDetected">
            <h3 class="text-(--text-feedback-positive) text-sm uppercase font-bold leading-4">{{ t('deleteMessageConfirm.protipTitle') }}</h3>
            <p class="text-(--text-default) text-sm pb-2" v-html="micromark(t('deleteMessageConfirm.protipContent'))" />
        </template>
        <Message v-if="hasDeletionError" severity="error" size="small" variant="simple">
            <template #icon>
                <span class="pi pi-exclamation-circle !text-xs !leading-3 -mt-[1px]" aria-hidden="true" />
            </template>
            {{ t('deleteMessageConfirm.deletionError') }}
        </Message>
        <template #footer>
            <Button :label="t('deleteMessageConfirm.cancelButton')" class="grow-1" severity="secondary" @click="emit('update:visible', false)" autofocus />
            <Button :loading="isDeleting" class="grow-1" severity="danger" @click="deleteEventConfirm()">
                <div class="p-button-label">{{ t('deleteMessageConfirm.deleteButton') }}</div>
                <div class="p-button-loading-dots" />
            </Button>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { micromark } from 'micromark'

import { useApplication } from '@/composables/application'
import { useRooms } from '@/composables/rooms'

import TimelineEventRender from './TimelineEventRender.vue'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'

import {
    type JoinedRoom,
    type EventWithRenderInfo,
} from '@/types'

const { t } = useI18n()
const { isTouchEventsDetected } = useApplication()
const { redactEvent } = useRooms()

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    room: {
        type: Object as PropType<JoinedRoom>,
        required: true,
    },
    eventRenderInfo: {
        type: Object as PropType<EventWithRenderInfo>,
        default: undefined,
    },
    i18nText: {
        type: Object as PropType<Record<string, string>>,
        required: true,
    },
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
    (e: 'deleteConfirmed'): void
}>()

watch(() => props.visible, (visible, wasVisible) => {
    if (visible && !wasVisible) {
        isDeleting.value = false
    }
})

const eventRenderInfoWithHeader = computed<EventWithRenderInfo | undefined>(() => {
    if (!props.eventRenderInfo) return
    return {
        ...props.eventRenderInfo,
        currentDateDivider: undefined,
        displayHeader: true,
    }
})

const isDeleting = ref<boolean>(false)
const hasDeletionError = ref<boolean>(false)

async function deleteEventConfirm() {
    hasDeletionError.value = false

    if (props.eventRenderInfo) {
        isDeleting.value = true
        try {
            await redactEvent(props.room.roomId, props.eventRenderInfo.event.eventId)
            emit('update:visible', false)
        } catch (error) {
            hasDeletionError.value = true
        } finally {
            isDeleting.value = false
        }
    } else {
        emit('update:visible', false)
    }
}

</script>

<style lang="scss" scoped>
.delete-message-confirm__message-preview {
    background: var(--background-base-low);
    pointer-events: none;
    padding: 0.625rem 0;
    margin: 1rem 0 1.25rem 0;
    border-radius: 0.25rem;
    overflow: hidden;
    box-shadow: var(--shadow-low);
    user-select: none;

    :deep(.p-chattimeline-event) {
        margin: 0 !important;
    }
}
</style>