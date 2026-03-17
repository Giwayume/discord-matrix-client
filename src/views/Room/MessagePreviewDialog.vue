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
            <div class="p-dialog-title">{{ t('messagePreviewDialog.title') }}</div>
        </template>
        <div class="message-preview-dialog__message-preview">
            <TimelineEventRender v-if="eventRenderInfo" :room="props.room" :e="eventRenderInfo" :i18nText="i18nText" />
        </div>
        
        <template #footer>
            <Button :label="t('messagePreviewDialog.closeButton')" severity="secondary" @click="emit('update:visible', false)" autofocus />
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, reactive, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { decryptMegolmEvent } from '@/utils/crypto'

import { messageEventTypes, settingsEventTypes } from '@/composables/event-timeline'

import { useClientSettingsStore } from '@/stores/client-settings'
import { useCryptoKeysStore } from '@/stores/crypto-keys'
import { useProfileStore } from '@/stores/profile'
import { useRoomStore } from '@/stores/room'
import { useSessionStore } from '@/stores/session'

import TimelineEventRender from './TimelineEventRender.vue'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

import {
    type JoinedRoom,
    type EventWithRenderInfo,
    type ApiV3SyncClientEventWithoutRoomId,
    type RoomEventReactionRender,
} from '@/types'

const { t } = useI18n()
const { settings } = useClientSettingsStore()
const { roomKeys } = storeToRefs(useCryptoKeysStore())
const { profiles } = storeToRefs(useProfileStore())
const { currentRoomEncryptionEnabledTimestamp, decryptedRoomEvents } = storeToRefs(useRoomStore())
const { userId: sessionUserId } = storeToRefs(useSessionStore())

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    room: {
        type: Object as PropType<JoinedRoom>,
        required: true,
    },
    event: {
        type: Object as PropType<ApiV3SyncClientEventWithoutRoomId>,
        default: undefined,
    },
    i18nText: {
        type: Object as PropType<Record<string, string>>,
        required: true,
    },
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
}>()

const eventRenderInfo = computed<EventWithRenderInfo | undefined>(() => {
    let event = props.event
    if (!event) return

    const today = new Date()
    const originDate = new Date(event.originServerTs)
    const category = settingsEventTypes.includes(event.type) ? 'settings' : messageEventTypes.includes(event.type) ? 'message' : 'unknown'
    
    const isToday = (
        originDate.getFullYear() === today.getFullYear()
        && originDate.getMonth() === today.getMonth()
        && originDate.getDate() === today.getDate()
    )

    const reactions: RoomEventReactionRender[] = (props.room.reactions[event.eventId] ?? []).map((reaction) => {
        return {
            ...reaction,
            highlighted: !!reaction.events.find((event) => event.sender === sessionUserId.value),
            displaynames: reaction.events.map((event) => profiles.value[event.sender]?.displayname ?? event.sender)
        }
    })

    const replacementEvent = props.room.replacements[event.eventId]?.find((replacementEvent) => replacementEvent.sender === event.sender)

    const eventRenderInfo = reactive<EventWithRenderInfo>({
        category,
        currentDateDivider: undefined,
        displayHeader: true,
        displayname: profiles.value[event.sender]?.displayname ?? event.sender,
        headerTime: isToday
            ? originDate.toLocaleString(undefined, { hour: 'numeric', minute: 'numeric' })
            : originDate.toLocaleString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }),
        time: originDate.toLocaleString(undefined, { hour: 'numeric', minute: 'numeric' }),
        isoTimestamp: originDate.toISOString(),
        avatarUrl: profiles.value[event.sender]?.avatarUrl,
        event: replacementEvent?.content?.['m.new_content'] ? { ...event, content: replacementEvent.content['m.new_content'] } : event,
        replacementEvent,
        replacementDate: replacementEvent?.originServerTs ? new Date(replacementEvent.originServerTs).toLocaleString() : undefined,
        reactions,
        replyTo: undefined,
        showUnencryptedWarning: settings.warnUnencryptedMessageInEncryptedRoom && currentRoomEncryptionEnabledTimestamp.value != null && event.type !== 'm.room.encrypted' && event.originServerTs > currentRoomEncryptionEnabledTimestamp.value,
    })

    if (event.type === 'm.room.encrypted') {
        if (decryptedRoomEvents.value[event.eventId]) {
            eventRenderInfo.event = decryptedRoomEvents.value[event.eventId]!
        } else {
            const roomKey = roomKeys.value[props.room.roomId]?.[event.content.sessionId]?.[event.content.senderKey]
            if (roomKey) {
                decryptMegolmEvent(event.content, roomKey).then((decrypted) => {
                    const decryptedEvent = {
                        ...event,
                        ...decrypted,
                    }
                    decryptedRoomEvents.value[event.eventId] = decryptedEvent
                    eventRenderInfo.event = decryptedEvent
                }).catch((error) => {
                    console.error(error)
                })
            }
        }
    }

    return eventRenderInfo
})

</script>

<style lang="scss" scoped>
.message-preview-dialog__message-preview {
    background: var(--background-base-low);
    pointer-events: none;
    padding: 0.625rem 0;
    margin: 1rem 0 0 0;
    border-radius: 0.25rem;
    overflow: hidden;
    box-shadow: var(--shadow-low);
    user-select: none;

    :deep(.p-chattimeline-event) {
        margin: 0 !important;
    }
}
</style>