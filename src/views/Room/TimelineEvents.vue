<template>
    <!-- This is here to trigger Vue update events. Wish I didn't have to hack it like this. -->
    <div hidden>{{ eventChunkRenderUuid }}</div>
    <div
        v-if="room"
        :data-timeline-id="componentUuid"
        class="p-chattimeline"
        @pointerdown="onPointerDownTimeline"
        @pointerup="onPointerUpTimeline"
        @mouseover="onMouseOverTimeline"
        @mouseleave="onMouseLeaveTimeline"
        @click.capture="onClickTimeline"
    >
        <ScrollPanel ref="scrollPanel">
            <div ref="scrollContentContainer" class="p-chattimeline-scroll-content-container">
                <MessagePlaceholder
                    v-if="showOldEventMessagePlaceholder"
                    ref="oldMessagePlaceholder"
                    :key="`oldMessagePlaceholderFor${room.roomId}`"
                />
                <div
                    v-for="(eventChunkList, eventChunkBufferIndex) of eventChunkBuffers"
                    :key="eventChunkBufferIndex"
                    :class="{
                        'p-chattimeline-scroll-content': activeEventChunkBufferIndex === eventChunkBufferIndex,
                        'p-chattimeline-scroll-content-sizer': activeEventChunkBufferIndex !== eventChunkBufferIndex,
                    }"
                >
                    <div ref="eventChunkBufferContainers" class="p-chattimeline-scroll-content-chunks">
                        <template v-for="chunk of eventChunkList" :key="chunk.id">
                            <TimelineEventRender
                                v-for="e of chunk.events"
                                :key="e.event.eventId"
                                :room="props.room"
                                :e="e"
                                :i18nText="i18nText"
                                :messageActionsTargetEventId="messageActionsTargetEventId"
                                :messageActionsContextMenuTargetEventId="messageActionsContextMenuTargetEventId"
                                :highlightEventId="highlightEventId"
                                :referenceEventId="referenceEventId"
                                @viewPhoto="viewPhoto($event)"
                            />
                        </template>
                    </div>
                    <!-- New messages bar -->
                    <!--div class="p-chattimeline-new-divider">
                        <div class="p-chattimeline-new-divider-tag">New</div>
                    </div-->
                    
                </div>
                <MessagePlaceholder
                    v-if="showNewEventMessagePlaceholder"
                    ref="newMessagePlaceholder"
                    :key="`newMessagePlaceholderFor${room.roomId}`"
                />
            </div>
        </ScrollPanel>
        <div
            v-if="!isTouchEventsDetected"
            ref="messageActionsContainer"
            :hidden="!messageActionsTargetElement"
            class="timeline-events__message-actions"
            :style="messageActionsFloatingStyles"
            @wheel="onWheelMessageActionsContainer"
        >
            <Button
                v-if="currentRoomPermissions.sendReaction"
                v-tooltip.top="{ value: i18nText.addReaction }"
                icon="pi pi-face-smile" :aria-label="i18nText.addReaction" severity="secondary" variant="text"
                data-link-id="addReaction"
            />
            <Button
                v-if="currentRoomPermissions.sendMessage && messageActionsTargetEventSender === sessionUserId"
                v-tooltip.top="{ value: i18nText.editMessage }"
                icon="pi pi-pencil" :aria-label="i18nText.editMessage" severity="secondary" variant="text"
                data-link-id="editMessage"
            />
            <Button
                v-if="currentRoomPermissions.sendMessage && messageActionsTargetEventSender !== sessionUserId"
                v-tooltip.top="{ value: i18nText.replyMessage }"
                icon="pi pi-reply -scale-x-100" :aria-label="i18nText.replyMessage" severity="secondary" variant="text"
                data-link-id="replyToMessage"
            />
            <Button
                v-tooltip.top="{ value: i18nText.forwardMessage }"
                icon="pi pi-reply" :aria-label="i18nText.forwardMessage" severity="secondary" variant="text"
            />
            <Button
                v-tooltip.top="{ value: i18nText.moreActionsMessage }"
                icon="pi pi-ellipsis-h" :aria-label="i18nText.moreActionsMessage" severity="secondary" variant="text"
                @click="showMoreMessageActions($event)"
            />
        </div>
        <ContextMenu ref="moreMessageActionsContextMenu" :model="moreMessageActionsContextMenuItems" @hide="onHideMoreMessageActionsContextMenu">
            <template #item="{ item, props }">
                <a class="p-contextmenu-item-link" v-bind="props.action">
                    <span class="p-contextmenu-item-label" :class="item.labelClassName">{{ item.label }}</span>
                    <span v-if="item.icon" :class="item.icon" class="ml-auto px-1 text-(--text-subtle)" aria-hidden="true" />
                    <i v-if="item.items" class="pi pi-angle-right ml-auto"></i>
                </a>
            </template>
        </ContextMenu>
        <UserProfilePopover ref="userProfilePopover" :userId="viewingProfileForUserId" />
        <MessagePreviewDialog v-model:visible="messagePreviewDialogVisble" :room="props.room" :event="messagePreviewEvent" :i18nText="i18nText" />
        <DeleteMessageConfirm v-model:visible="deleteMessageConfirmVisible" :room="props.room" :eventRenderInfo="deleteMessageConfirmEventRenderInfo" :i18nText="i18nText" />
        <EditGroup v-model:visible="editGroupDialogVisible" :roomId="props.room.roomId" />
        <PhotoViewer v-model:visible="photoViewerVisible" :imageEvent="photoViewerImageEvent" />
        <FixDecryptionDialog v-model:visible="fixDecryptDialogVisible" :roomId="room.roomId" :eventId="fixDecryptEventId" />
    </div>
</template>

<script setup lang="ts">
import {
    computed, defineAsyncComponent, nextTick,
    onUpdated, onMounted, onUnmounted, ref, watch, type PropType,
 } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { v4 as uuidv4 } from 'uuid'
import { useFloating, offset as floatingOffset, autoUpdate as floatingAutoUpdate } from '@floating-ui/vue'

import { decryptMegolmEvent } from '@/utils/crypto'
import { throttle } from '@/utils/timing'

import { useApplication } from '@/composables/application'
import { useKeyboard } from '@/composables/keyboard'
import { useRooms } from '@/composables/rooms'
import { attachmentEventMessageTypes, messageEventTypes, settingsEventTypes } from '@/composables/event-timeline'

import { useClientSettingsStore } from '@/stores/client-settings'
import { useCryptoKeysStore } from '@/stores/crypto-keys'
import { useProfileStore } from '@/stores/profile'
import { useRoomStore } from '@/stores/room'
import { useSessionStore } from '@/stores/session'

const DeleteMessageConfirm = defineAsyncComponent(() => import('./DeleteMessageConfirm.vue'))
const EditGroup = defineAsyncComponent(() => import('./EditGroup.vue'))
const FixDecryptionDialog = defineAsyncComponent(() => import('@/views/EncryptionSetup/FixDecryptionDialog.vue'))
import MessagePlaceholder from './MessagePlaceholder.vue'
const MessagePreviewDialog = defineAsyncComponent(() => import('./MessagePreviewDialog.vue'))
const PhotoViewer = defineAsyncComponent(() => import('./PhotoViewer.vue'))
import TimelineEventRender from './TimelineEventRender.vue'
const UserProfilePopover = defineAsyncComponent(() => import('./UserProfilePopover.vue'))

import Button from 'primevue/button'
import ContextMenu from 'primevue/contextmenu'
import ScrollPanel from 'primevue/scrollpanel'
import { useToast } from 'primevue/usetoast'
import vTooltip from 'primevue/tooltip'
import type { MenuItem, MenuItemCommandEvent } from 'primevue/menuitem'

import {
    type JoinedRoom, type RoomEventReactionRender,
    type ApiV3SyncClientEventWithoutRoomId,
    type EventImageContent,
    type EventWithRenderInfo,
    type EmojiPickerEmojiItem,
} from '@/types'

interface EventChunk {
    id: string;
    loading: boolean;
    events: EventWithRenderInfo[];
}

const { t } = useI18n()
const toast = useToast()
const { settings } = useClientSettingsStore()
const { profiles } = storeToRefs(useProfileStore())
const { isTouchEventsDetected } = useApplication()
const { isShiftKeyPressed } = useKeyboard()
const { getMessageEvent, getPreviousMessages, redactEvent } = useRooms()
const roomStore = useRoomStore()
const { currentRoomPermissions, decryptedRoomEvents } = storeToRefs(roomStore)
const { getTimelineEventById, getTimelineEventIndexById } = useRoomStore()
const { roomKeys } = storeToRefs(useCryptoKeysStore())
const { userId: sessionUserId } = storeToRefs(useSessionStore())

const props = defineProps({
    room: {
        type: Object as PropType<JoinedRoom>,
        required: true,
    },
    referenceEventId: {
        type: String,
        default: undefined,
    },
})

const emit = defineEmits<{
    (e: 'update:anchoredToBottom', isAnchoredToBottom: boolean): void
    (e: 'update:editEventId', editEventId?: string): void
    (e: 'update:replyToEventId', replyToEventId?: string): void
    (e: 'retrySendMessage', eventId?: string): void
    (e: 'selectEmoji', event: Event, referenceEventId: string): void
    (e: 'toggleEmoji', emoji: EmojiPickerEmojiItem, referenceEventId: string): void
}>()

const componentUuid = uuidv4()

// Caching i18n here, calculating in template for each item is extremely slow.
const i18nText = {
    roomEncryptionEnabled: t('room.roomEncryptionEnabled'),
    unableToDecryptMessage: t('room.unableToDecryptMessage'),
    learnFixDecrypt: t('room.learnFixDecrypt'),
    joinedTheRoomPrefix: t('room.joinedTheRoomPrefix'),
    joinedTheRoomSuffix: t('room.joinedTheRoomSuffix'),
    leftTheRoom: t('room.leftTheRoom'),
    bannedFromTheRoom: t('room.bannedFromTheRoom'),
    changedGroupIcon: t('room.changedGroupIcon'),
    changedGroupNamePrefix: t('room.changedGroupNamePrefix'),
    changedGroupNameSuffix: t('room.changedGroupNameSuffix'),
    editGroupButton: t('room.editGroupButton'),
    addReaction: t('room.addReaction'),
    messageEditedIndicator: t('room.messageEditedIndicator'),
    messageSendError: t('room.messageSendError'),
    messageSendRetry: t('room.messageSendRetry'),
    editMessage: t('room.editMessage'),
    replyMessage: t('room.replyMessage'),
    forwardMessage: t('room.forwardMessage'),
    moreActionsMessage: t('room.moreActionsMessage'),
    replyToNoMessagePreview: t('room.replyToNoMessagePreview'),
    replyToNoAttachmentPreview: t('room.replyToNoAttachmentPreview'),
    unknownUserDisplayname: t('room.unknownUserDisplayname'),
}

const eventChunkSwapReadyUuid = ref<string | undefined>()
const eventChunkRenderUuid = ref<string>('')
const eventChunkRenderShowOldEventMessagePlaceholder = ref<boolean>(false)
const eventChunkBuffers = ref<EventChunk[][]>([[], []])
const activeEventChunkBufferIndex = ref<number>(0)
const eventChunkBufferContainers = ref<HTMLDivElement[]>([])

const isJustMounted = ref<boolean>(false)
const scrollPanel = ref<typeof ScrollPanel>()
const scrollPanelContent = ref<HTMLDivElement>()
const scrollContentContainer = ref<HTMLDivElement>()

const oldMessagePlaceholder = ref<InstanceType<typeof MessagePlaceholder>>()
const oldMessagePlaceholderHeight = ref<number>(1)
const newMessagePlaceholder = ref<InstanceType<typeof MessagePlaceholder>>()
const newMessagePlaceholderHeight = ref<number>(1)
const messagePlaceholderScrollMargin = ref<number>(Math.min(Math.floor(window.innerHeight / 2), 200))
const isLoadingPreviousMessages = ref<boolean>(false)

const needsMoreOldEvents = ref<boolean>(false)
const needsMoreNewEvents = ref<boolean>(false)

const eventsPerChunk = Math.ceil(Math.sqrt(window.innerHeight * 2 / 26))
const chunksPerView = Math.ceil(Math.sqrt(window.innerHeight * 2 / 26))
const offsetEventId = ref<string | undefined>()
const lastBufferSwapOffsetEventId = ref<string | undefined>()
const offsetChunk = ref<number>(0) // Relative to offsetEventId. Negative numbers scroll up for older messages
const lastBufferSwapOffsetChunk = ref<number>(0)
const lastBufferSwapVisibleTimelineLength = ref<number>(0)
const editGroupDialogVisible = ref<boolean>(false)
const fixDecryptDialogVisible = ref<boolean>(false)
const fixDecryptEventId = ref<string>()
const photoViewerVisible = ref<boolean>(false)
const photoViewerImageEvent = ref<ApiV3SyncClientEventWithoutRoomId<EventImageContent> | undefined>()

const isAnchoredToBottom = ref<boolean>(true)
const isActivelyScrolling = ref<boolean>(false)
let isAnchorScrollBottomRepeat = false
let anchorScrollBottomRepeatTimeoutHandle: number | undefined = undefined
watch(() => props.room, () => {
    isAnchoredToBottom.value = true
})
watch(() => isAnchoredToBottom.value, () => {
    emit('update:anchoredToBottom', isAnchoredToBottom.value)
}, { immediate: true })
watch(() => props.room.visibleTimeline.length, () => {
    if (isAnchoredToBottom.value && props.room.visibleTimeline.length > 0) {
        offsetEventId.value = props.room.visibleTimeline[props.room.visibleTimeline.length - 1]?.eventId
        offsetChunk.value = 0
    }
})

const offsetEventIndex = computed<number>(() => {
    return getTimelineEventIndexById(props.room.visibleTimeline, offsetEventId.value) ?? props.room.visibleTimeline.length - 1
})

const showOldEventMessagePlaceholder = ref<boolean>(true)
function shouldShowOldEventMessagePlaceholder() {
    if (offsetEventIndex.value + (offsetChunk.value * eventsPerChunk) - (chunksPerView * eventsPerChunk) > 0) {
        return true
    } else {
        return props.room.visibleTimeline[0]?.type !== 'm.room.create'
    }
}
watch(() => showOldEventMessagePlaceholder.value, () => {
    if (showOldEventMessagePlaceholder.value) {
        nextTick(() => {
            oldMessagePlaceholderHeight.value = oldMessagePlaceholder.value?.$el.offsetHeight ?? 1
        })
    }
}, { immediate: true })

const showNewEventMessagePlaceholder = computed<boolean>(() => {
    return (
        !isAnchoredToBottom.value
        && offsetEventIndex.value + 1 + (offsetChunk.value * eventsPerChunk) < props.room.visibleTimeline.length
    )
})
watch(() => showNewEventMessagePlaceholder.value, () => {
    if (showNewEventMessagePlaceholder.value) {
        nextTick(() => {
            newMessagePlaceholderHeight.value = newMessagePlaceholder.value?.$el.offsetHeight ?? 1
        })
    }
}, { immediate: true })

const isAllLoadingEventChunksReady = ref<boolean>(true)
const loadingEventChunks = computed<EventChunk[]>(() => {
    const today = new Date()
    const chunks: EventChunk[] = []

    let previousEvent: ApiV3SyncClientEventWithoutRoomId | undefined = undefined
    let currentDateDividerTs: number = 0
    for (let currentChunk = offsetChunk.value - chunksPerView; currentChunk <= offsetChunk.value; currentChunk += 1) {
        const currentChunkBottomEventIndex = offsetEventIndex.value + (currentChunk * eventsPerChunk)

        const chunk: EventChunk = {
            id: `${offsetEventId.value}::${offsetChunk.value + currentChunk}`,
            loading: true, // TODO - wait for network calls
            events: [],
        }

        const eventSlice = props.room.visibleTimeline.slice(
            Math.max(0, currentChunkBottomEventIndex + 1 - eventsPerChunk), Math.max(0, currentChunkBottomEventIndex + 1)
        )
        for (const event of eventSlice) {

            const previousEventOriginDate = new Date(currentDateDividerTs)
            const originDate = new Date(event.originServerTs)
            const category = settingsEventTypes.includes(event.type) ? 'settings' : messageEventTypes.includes(event.type) ? 'message' : 'unknown'
            const previousCategory = settingsEventTypes.includes(previousEvent?.type as string) ? 'settings' : messageEventTypes.includes(previousEvent?.type as string) ? 'message' : 'unknown'
            
            const currentDateDivider = (
                originDate.getFullYear() > previousEventOriginDate.getFullYear()
                || (
                    originDate.getFullYear() === previousEventOriginDate.getFullYear()
                    && originDate.getMonth() > previousEventOriginDate.getMonth()
                )
                || (
                    originDate.getFullYear() === previousEventOriginDate.getFullYear()
                    && originDate.getDate() !== previousEventOriginDate.getDate()
                    && originDate.getDate() > previousEventOriginDate.getDate()
                )
            ) ? originDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : undefined

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

            const mentionedUserIds: string[] = event.content?.['m.mentions']?.userIds ?? []
            const replyToEventId: string | undefined = event.content?.['m.relates_to']?.['m.in_reply_to']?.eventId
            let replyTo: EventWithRenderInfo['replyTo'] = undefined
            if (replyToEventId) {
                const replyToEvent = getTimelineEventById(props.room.visibleTimeline, replyToEventId, 200, currentChunkBottomEventIndex)
                const replyToReplacementEvent = props.room.replacements[replyToEventId]?.find((replacementEvent) => replacementEvent.sender === event.sender)
                const replyUserId = replyToEvent?.sender ?? mentionedUserIds[0]
                const userProfile = profiles.value[replyUserId ?? '']
                const replyToEventContent = (replyToReplacementEvent && decryptedRoomEvents.value[replyToReplacementEvent.eventId])
                    ? decryptedRoomEvents.value[replyToReplacementEvent.eventId]
                    : (replyToReplacementEvent?.content)
                        ? replyToReplacementEvent.content
                        : (replyToEvent && decryptedRoomEvents.value[replyToEventId])
                            ? decryptedRoomEvents.value[replyToEventId].content
                            : replyToEvent?.content
                const isAttachment = attachmentEventMessageTypes.includes(replyToEventContent?.msgtype)
                replyTo = {
                    userId: replyUserId,
                    displayname: userProfile?.displayname ?? replyUserId,
                    avatarUrl: userProfile?.avatarUrl,
                    eventId: replyToEventId,
                    bodyPreview: !isAttachment ? replyToEventContent?.body?.substring(0, 1000) : undefined,
                    messageType: replyToEventContent?.msgtype ?? 'm.text',
                    isAttachment,
                }
            }

            chunk.events.push({
                category,
                currentDateDivider,
                displayHeader: previousEvent?.sender !== event.sender
                    || category !== previousCategory
                    || !!replyTo
                    || !!currentDateDivider
                    || originDate.getTime() - previousEventOriginDate.getTime() > 300000,
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
                replyTo,
            })

            previousEvent = event
            currentDateDividerTs = event.type === 'm.room.create' ? 0 : (event.originServerTs > currentDateDividerTs ? event.originServerTs : currentDateDividerTs)
        }

        isAllLoadingEventChunksReady.value = false
        const decryptPromises: Promise<void>[] = []
        for (const event of chunk.events) {
            if (event.replacementEvent?.type === 'm.room.encrypted') {
                if (decryptedRoomEvents.value[event.replacementEvent.eventId]) {
                    event.replacementEvent = decryptedRoomEvents.value[event.replacementEvent.eventId]!
                    event.event.content = event.replacementEvent.content['m.new_content']
                    continue
                }
                const roomKey = roomKeys.value[props.room.roomId]?.[event.event.content.sessionId]?.[event.event.content.senderKey]
                if (!roomKey) continue
                // TODO - wait until all events are decrypted then assign at once (to create only a single re-render)
                decryptPromises.push(
                    decryptMegolmEvent(event.replacementEvent.content, roomKey).then((decrypted) => {
                        const decryptedEvent = {
                            ...event.replacementEvent,
                            ...decrypted,
                        }
                        decryptedRoomEvents.value[event.event.eventId] = decryptedEvent
                        event.replacementEvent = decryptedEvent
                        event.event.content = decryptedEvent.content['m.new_content']
                    }).catch((error) => {
                        console.error(error)
                    })
                )
            } else if (event.event.type === 'm.room.encrypted') {
                if (decryptedRoomEvents.value[event.event.eventId]) {
                    event.event = decryptedRoomEvents.value[event.event.eventId]!
                    continue
                }
                const roomKey = roomKeys.value[props.room.roomId]?.[event.event.content.sessionId]?.[event.event.content.senderKey]
                if (!roomKey) continue
                decryptPromises.push(
                    decryptMegolmEvent(event.event.content, roomKey).then((decrypted) => {
                        const decryptedEvent = {
                            ...event.event,
                            ...decrypted,
                        }
                        decryptedRoomEvents.value[event.event.eventId] = decryptedEvent
                        event.event = decryptedEvent
                    }).catch((error) => {
                        console.error(error)
                    })
                )
            }
            
        }
        Promise.allSettled(decryptPromises).then(() => {
            isAllLoadingEventChunksReady.value = true
        })
        chunks.push(chunk)
    }
    return chunks
})
watch(() => [loadingEventChunks.value, isAllLoadingEventChunksReady.value] as const, ([eventChunks, isAllLoadingEventChunksReady]) => {
    if (!isAllLoadingEventChunksReady) return
    if (eventChunkSwapReadyUuid.value) {
        swapEventChunkBuffers()
    }
    const inactiveEventChunkBufferIndex = activeEventChunkBufferIndex.value === 0 ? 1 : 0
    eventChunkBuffers.value[inactiveEventChunkBufferIndex] = eventChunks
    eventChunkRenderUuid.value = uuidv4()
    eventChunkRenderShowOldEventMessagePlaceholder.value = shouldShowOldEventMessagePlaceholder()
}, { immediate: true })

watch(() => props.room.nonSequentialUpdateUuid, () => {
    nextTick(() => {
        swapEventChunkBuffers()
    })
})

onUpdated(() => {
    if (eventChunkRenderUuid.value) {
        eventChunkSwapReadyUuid.value = eventChunkRenderUuid.value
        eventChunkRenderUuid.value = ''
        if (isAnchoredToBottom.value) {
            swapEventChunkBuffers()
        }
    }
    if (isAnchoredToBottom.value && isAnchorScrollBottomRepeat) {
        scrollPanelContent.value!.scrollTop = scrollPanelContent.value!.scrollHeight - scrollPanelContent.value!.offsetHeight
    }
})

function swapEventChunkBuffers() {
    if (!eventChunkSwapReadyUuid.value) return

    const inactiveEventChunkBufferIndex = activeEventChunkBufferIndex.value === 0 ? 1 : 0

    manageScrollSwap:
    if (scrollPanelContent.value) {
        const activeContainer = eventChunkBufferContainers.value[activeEventChunkBufferIndex.value]
        const inactiveContainer = eventChunkBufferContainers.value[inactiveEventChunkBufferIndex]
        if (!activeContainer || !inactiveContainer) break manageScrollSwap
        const oldEvents = activeContainer.querySelectorAll('[data-event-id]')

        let oldReferenceEvent = oldEvents[0]
        let newReferenceEvent = inactiveContainer.querySelector(`[data-event-id="${oldReferenceEvent?.getAttribute('data-event-id')}"]`)
        if (!newReferenceEvent) {
            oldReferenceEvent = oldEvents[oldEvents.length - 1]
            newReferenceEvent = inactiveContainer.querySelector(`[data-event-id="${oldReferenceEvent?.getAttribute('data-event-id')}"]`)
        }
        if (!oldReferenceEvent || !newReferenceEvent) break manageScrollSwap

        const newReferenceClientRect = newReferenceEvent.getBoundingClientRect() 
        const newReferenceScrollTop = newReferenceClientRect.top - inactiveContainer.getBoundingClientRect().top
        const oldReferenceClientRect = oldReferenceEvent.getBoundingClientRect()
        const oldReferenceScrollTop = oldReferenceClientRect.top - activeContainer.getBoundingClientRect().top

        const oldMessagePlaceholderGap = 0 /* (
            (eventChunkRenderShowOldEventMessagePlaceholder.value ? oldMessagePlaceholderHeight.value : 0)
            - (showOldEventMessagePlaceholder.value ? oldMessagePlaceholderHeight.value : 0)
        )*/

        const oldScrollTop = scrollPanelContent.value!.scrollTop
        inactiveContainer.parentElement?.classList.remove('p-chattimeline-scroll-content-sizer')
        activeContainer.parentElement?.classList.add('p-chattimeline-scroll-content-sizer')
        if (
            isAnchoredToBottom.value
            && !isActivelyScrolling.value
            && (
                (
                    offsetEventId.value === lastBufferSwapOffsetEventId.value
                    && offsetChunk.value === lastBufferSwapOffsetChunk.value
                )
                || (
                    offsetEventId.value !== lastBufferSwapOffsetEventId.value
                    && props.room.visibleTimeline.length > lastBufferSwapVisibleTimelineLength.value
                    && offsetEventId.value === props.room.visibleTimeline[props.room.visibleTimeline.length - 1]?.eventId
                )
            )
        ) {
            scrollPanelContent.value!.scrollTop = scrollPanelContent.value!.scrollHeight - scrollPanelContent.value!.offsetHeight
            isAnchorScrollBottomRepeat = true
            clearTimeout(anchorScrollBottomRepeatTimeoutHandle)
            anchorScrollBottomRepeatTimeoutHandle = setTimeout(anchorScrollBottomRepeatCallback, 50)
        } else {
            scrollPanelContent.value!.scrollTop = oldScrollTop + (newReferenceScrollTop - oldReferenceScrollTop) + (newReferenceClientRect.height - oldReferenceClientRect.height) + oldMessagePlaceholderGap
        }
    }

    eventChunkSwapReadyUuid.value = undefined
    eventChunkBuffers.value[activeEventChunkBufferIndex.value] = []
    activeEventChunkBufferIndex.value = inactiveEventChunkBufferIndex
    showOldEventMessagePlaceholder.value = eventChunkRenderShowOldEventMessagePlaceholder.value

    lastBufferSwapOffsetEventId.value = offsetEventId.value
    lastBufferSwapOffsetChunk.value = offsetChunk.value
    lastBufferSwapVisibleTimelineLength.value = props.room.visibleTimeline.length
}
function anchorScrollBottomRepeatCallback() {
    isAnchorScrollBottomRepeat = false
}

let fetchOldEventsAbortController: AbortController | undefined
watch(() => needsMoreOldEvents.value, async () => {
    fetchOldEventsAbortController?.abort()

    if (needsMoreOldEvents.value) {
        const abortController = new AbortController()
        fetchOldEventsAbortController = abortController

        let targetOffsetChunk = offsetChunk.value - Math.round(chunksPerView / 2)
        let targetOffsetEventId = offsetEventId.value
        let targetOffsetEventIndex = offsetEventIndex.value

        // If the top of the timeline is encountered, reset to fit the chunked events exactly to the top.
        if (props.room.visibleTimeline[0]?.type === 'm.room.create') {
            targetOffsetChunk = Math.max(Math.floor(-offsetEventIndex.value / eventsPerChunk), targetOffsetChunk)
            if (
                offsetEventIndex.value + 1 + (targetOffsetChunk * eventsPerChunk)
                < (eventsPerChunk * chunksPerView)
            ) {
                targetOffsetEventIndex = Math.min(props.room.visibleTimeline.length - 1, eventsPerChunk * chunksPerView)
                const targetOffsetEvent = props.room.visibleTimeline[targetOffsetEventIndex]
                if (!targetOffsetEvent) {
                    needsMoreOldEvents.value = false
                    return
                }
                targetOffsetEventId = targetOffsetEvent.eventId
                targetOffsetChunk = 0
            }
        }

        await loadPreviousMessagesUpToChunk(targetOffsetChunk, targetOffsetEventId, abortController)

        if (abortController?.signal.aborted) return

        // If the top of the timeline is encountered, reset to fit the window exactly to the top.
        if (props.room.visibleTimeline[0]?.type === 'm.room.create') {
            targetOffsetChunk = Math.max(Math.floor(-offsetEventIndex.value / eventsPerChunk), targetOffsetChunk)
            if (
                offsetEventIndex.value + 1 + (targetOffsetChunk * eventsPerChunk)
                < (eventsPerChunk * chunksPerView)
            ) {
                targetOffsetEventIndex = Math.min(props.room.visibleTimeline.length - 1, eventsPerChunk * chunksPerView)
                const targetOffsetEvent = props.room.visibleTimeline[targetOffsetEventIndex]
                if (!targetOffsetEvent) {
                    needsMoreOldEvents.value = false
                    return
                }
                targetOffsetEventId = targetOffsetEvent.eventId
                targetOffsetChunk = 0
            }
        }

        if (
            needsMoreOldEvents.value
            && (
                targetOffsetChunk !== offsetChunk.value
                || targetOffsetEventId !== offsetEventId.value
                || targetOffsetEventIndex !== offsetEventIndex.value
            )
        ) {
            needsMoreOldEvents.value = false
            offsetChunk.value = targetOffsetChunk
            offsetEventId.value = targetOffsetEventId
            await nextTick()
        }
    } else {
        fetchOldEventsAbortController?.abort()
    }
}, { immediate: true })

let fetchNewEventsAbortController: AbortController | undefined
watch(() => needsMoreNewEvents.value, async () => {
    fetchNewEventsAbortController?.abort()

    if (needsMoreNewEvents.value) {
        const abortController = new AbortController()
        fetchNewEventsAbortController = abortController

        if (
            needsMoreNewEvents.value
            && offsetEventIndex.value + 1 + (offsetChunk.value * eventsPerChunk) - (chunksPerView * eventsPerChunk) < props.room.visibleTimeline.length
        ) {
            needsMoreNewEvents.value = false
            offsetChunk.value += Math.round(chunksPerView / 2)
            const maxOffsetChunk = Math.floor((props.room.visibleTimeline.length - offsetEventIndex.value) / eventsPerChunk)
            if (offsetChunk.value > maxOffsetChunk) {
                const latestEvent = props.room.visibleTimeline[props.room.visibleTimeline.length - 1]
                if (latestEvent) {
                    offsetEventId.value = latestEvent.eventId
                    offsetChunk.value = 0
                }
            }
        }
    } else {
        fetchNewEventsAbortController?.abort()
    }
}, { immediate: true })

onMounted(() => {
    if (scrollPanel.value) {
        scrollPanelContent.value = (scrollPanel.value as any).$el?.querySelector('.p-scrollpanel-content')
        scrollPanelContent.value?.addEventListener('scroll', onScrollContent)
        scrollPanelContent.value?.addEventListener('wheel', onWheelContent)
    }

    // TODO - update to latest message whenever scrolled to bottom (live view)
    if (props.room.visibleTimeline.length > 0) {
        offsetEventId.value = props.room.visibleTimeline[props.room.visibleTimeline.length - 1]?.eventId
    }

    // Initial timeline render
    eventChunkBuffers.value[activeEventChunkBufferIndex.value] = loadingEventChunks.value
    showOldEventMessagePlaceholder.value = shouldShowOldEventMessagePlaceholder()

    fetchOldEventsAbortController?.abort()
    fetchOldEventsAbortController = new AbortController()
    loadPreviousMessagesUpToChunk(offsetChunk.value, offsetEventId.value, fetchOldEventsAbortController)

    // TODO - how to handle error scenarios:
    // 400/404 M_NOT_FOUND
    // 400 M_LIMIT_EXCEEDED
    // 403 M_FORBIDDEN
    // May need to reset sync in some cases if can't request more message history. Prompt user?

    nextTick(() => {
        isJustMounted.value = true

        scrollToBottom()
    })
})

onUnmounted(() => {
    window.dispatchEvent(new CustomEvent('discortix-timeline-unmounted', { detail: { id: componentUuid } }))
    scrollPanelContent.value?.removeEventListener('scroll', onScrollContent)
    scrollPanelContent.value?.removeEventListener('wheel', onWheelContent)
    fetchOldEventsAbortController?.abort()
    fetchNewEventsAbortController?.abort()
})

async function loadPreviousMessagesUpToChunk(targetOffsetChunk: number, targetOffsetEventId?: string, abortController?: AbortController) {
    isLoadingPreviousMessages.value = true
    try {
        if (targetOffsetEventId === offsetEventId.value) {
            while (
                offsetEventIndex.value + 1 + (targetOffsetChunk * eventsPerChunk) - (chunksPerView * eventsPerChunk) < 0
                && props.room.visibleTimeline[0]?.type !== 'm.room.create'
            ) {
                if (abortController?.signal.aborted) throw new Error('Canceling network fetch.')

                await getPreviousMessages(props.room.roomId)

                if (abortController?.signal.aborted) throw new Error('Canceling network fetch.')
                await nextTick()
                await new Promise((resolve) => requestAnimationFrame(resolve))
            }
        }
    } catch (error) {
        // Throws are used for flow control
    } finally {
        isLoadingPreviousMessages.value = false
    }
}

function determineIfNearPlaceholderMargins() {
    if (!scrollPanelContent.value || eventChunkSwapReadyUuid.value) return
    const needsOld = showOldEventMessagePlaceholder.value && (
        scrollPanelContent.value.scrollTop < oldMessagePlaceholderHeight.value + messagePlaceholderScrollMargin.value
    )

    const needsNew = showNewEventMessagePlaceholder.value && (
        scrollPanelContent.value.scrollTop > (scrollPanelContent.value.scrollHeight - scrollPanelContent.value.offsetHeight) - (newMessagePlaceholderHeight.value + messagePlaceholderScrollMargin.value)
    )

    if (needsOld && needsNew) {
        if (scrollPanelContent.value.scrollTop < (scrollPanelContent.value.scrollHeight - scrollPanelContent.value.offsetHeight) / 3) {
            needsMoreOldEvents.value = true
            needsMoreNewEvents.value = false
        } else if (scrollPanelContent.value.scrollTop > (scrollPanelContent.value.scrollHeight - scrollPanelContent.value.offsetHeight) * (2/3)) {
            needsMoreOldEvents.value = false
            needsMoreNewEvents.value = true
        }
    } else {
        needsMoreOldEvents.value = needsOld
        needsMoreNewEvents.value = needsNew
    }
}

let scrollEndTimeoutHandle: number | undefined = undefined
function onScrollContent(event: Event) {
    clearTimeout(scrollEndTimeoutHandle)
    scrollEndTimeoutHandle = setTimeout(() => {
        onScrollContentEnd()
    }, 80)
    onScrollContentDeferred(event)
}

function onScrollContentEnd() {
    if (eventChunkSwapReadyUuid.value) {
        swapEventChunkBuffers()
    }
}

const onScrollContentDeferred = throttle((event: Event) => {
    if (isJustMounted.value) {
        isJustMounted.value = false
    } else {
        if (!scrollPanelContent.value) return

        determineIfNearPlaceholderMargins()
        
        isAnchoredToBottom.value = (
            // Roughly, bottom of list is within render view.
            (offsetEventIndex.value + 1 + (offsetChunk.value * eventsPerChunk) > props.room.visibleTimeline.length - eventsPerChunk)
            // Scroll bar is near the bottom.
            && scrollPanelContent.value.scrollTop >= scrollPanelContent.value.scrollHeight - scrollPanelContent.value.offsetHeight - 100
        )
        
    }
}, 100)

let wheelEndTimeoutHandle: number | undefined = undefined
function onWheelContent(event: WheelEvent) {
    isActivelyScrolling.value = true
    clearTimeout(wheelEndTimeoutHandle)
    wheelEndTimeoutHandle = setTimeout(onWheelContentEnd, 80)
}

function onWheelContentEnd() {
    isActivelyScrolling.value = false
}

async function scrollToBottom() {
    if (scrollPanelContent.value) {
        scrollPanelContent.value.scrollTop = scrollPanelContent.value.scrollHeight - scrollPanelContent.value.offsetHeight
    }
    isAnchoredToBottom.value = true
    needsMoreNewEvents.value = true
    await nextTick()
}

/*---------------*\
| Message Actions |
\*---------------*/

const messageActionsContainer = ref<HTMLDivElement>()
const messageActionsTargetEventId = ref<string>()
const messageActionsTargetEventSender = ref<string>()
const messageActionsContextMenuTargetEventId = ref<string>()
const keepMessageActionsContextMenuTargetEventId = ref<boolean>(false)
const messageActionsContextMenuTargetEventSender = ref<string>()
const messageActionsTargetElement = ref<HTMLElement>()
const { floatingStyles: messageActionsFloatingStyles, update: updateMessageActionsFloating } = useFloating(
    messageActionsTargetElement, messageActionsContainer, {
        whileElementsMounted: floatingAutoUpdate,
        transform: false,
        placement: 'top-end',
        middleware: [floatingOffset({ mainAxis: -12, crossAxis: -8 })]
    }
);

const deleteMessageConfirmVisible = ref<boolean>(false)
const deleteMessageConfirmEventRenderInfo = ref<EventWithRenderInfo>()

const moreMessageActionsContextMenu = ref<InstanceType<typeof ContextMenu>>()
const moreMessageActionsContextMenuItems = computed(() => {
    const contextMenuItems: MenuItem[] = []
    if (currentRoomPermissions.value.sendReaction) {
        contextMenuItems.push({
            key: 'addReaction',
            label: t('room.moreMessageActions.addReaction'),
            icon: 'pi pi-face-smile',
            command: runMoreMessageActionsContextMenuCommand,
        })
        contextMenuItems.push({ separator: true })
    }
    if (currentRoomPermissions.value.sendMessage && sessionUserId.value === messageActionsContextMenuTargetEventSender.value) {
        contextMenuItems.push({
            key: 'editMessage',
            label: t('room.moreMessageActions.editMessage'),
            icon: 'pi pi-pencil',
            command: runMoreMessageActionsContextMenuCommand,
        })
    }
    if (currentRoomPermissions.value.sendMessage) {
        contextMenuItems.push({
            key: 'replyToMessage',
            label: t('room.moreMessageActions.reply'),
            icon: 'pi pi-reply -scale-x-100',
            command: runMoreMessageActionsContextMenuCommand,
        })
    }
    contextMenuItems.push({
        key: 'forwardMessage',
        label: t('room.moreMessageActions.forward'),
        icon: 'pi pi-reply',
        command: runMoreMessageActionsContextMenuCommand,
    })
    if (currentRoomPermissions.value.sendMessage) {
        contextMenuItems.push({
            key: 'createThread',
            label: t('room.moreMessageActions.createThread'),
            icon: 'pi pi-receipt',
            command: runMoreMessageActionsContextMenuCommand,
        })
    }
    contextMenuItems.push({ separator: true })
    contextMenuItems.push({
        key: 'copyText',
        label: t('room.moreMessageActions.copyText'),
        icon: 'pi pi-copy',
        command: runMoreMessageActionsContextMenuCommand,
    })
    if (currentRoomPermissions.value.changePinnedEvents) {
        contextMenuItems.push({
            key: 'pinMessage',
            label: t('room.moreMessageActions.pinMessage'),
            icon: 'pi pi-thumbtack',
            command: runMoreMessageActionsContextMenuCommand,
        })
    }
    contextMenuItems.push({
        key: 'markUnread',
        label: t('room.moreMessageActions.markUnread'),
        icon: 'pi pi-book',
        command: runMoreMessageActionsContextMenuCommand,
    })
    contextMenuItems.push({
        key: 'copyMessageLink',
        label: t('room.moreMessageActions.copyMessageLink'),
        icon: 'pi pi-link',
        command: runMoreMessageActionsContextMenuCommand,
    })
    contextMenuItems.push({
        key: 'speakMessage',
        label: t('room.moreMessageActions.speakMessage'),
        icon: 'pi pi-headphones',
        command: runMoreMessageActionsContextMenuCommand,
    })
    contextMenuItems.push({ separator: true })
    if (
        (currentRoomPermissions.value.redactOwnEvent && sessionUserId.value === messageActionsContextMenuTargetEventSender.value)
        || (currentRoomPermissions.value.redactOtherUserEvent && sessionUserId.value !== messageActionsContextMenuTargetEventSender.value)
    ) {
        contextMenuItems.push({
            key: 'deleteMessage',
            label: t('room.moreMessageActions.deleteMessage'),
            icon: 'pi pi-trash !text-(--text-feedback-critical)',
            labelClassName: 'text-(--text-feedback-critical)',
            command: runMoreMessageActionsContextMenuCommand,
        })
        contextMenuItems.push({ separator: true })
    }
    if (settings.isDeveloperMode) {
        contextMenuItems.push({
            key: 'copyMessageId',
            label: t('room.moreMessageActions.copyMessageId'),
            icon: 'pi pi-id-card',
            command: runMoreMessageActionsContextMenuCommand,
        })
    }
    if (contextMenuItems[contextMenuItems.length - 1]?.separator) {
        contextMenuItems.pop()
    }
    return contextMenuItems
})

async function runMoreMessageActionsContextMenuCommand(event: MenuItemCommandEvent) {
    const eventId = messageActionsContextMenuTargetEventId.value || messageActionsTargetEventId.value
    if (!eventId) return
    switch (event.item.key) {
        case 'addReaction':
            emit('selectEmoji', event.originalEvent, eventId)
            messageActionsContextMenuTargetEventId.value = eventId
            keepMessageActionsContextMenuTargetEventId.value = true
            break
        case 'editMessage':
            emit('update:editEventId', eventId)
            break
        case 'replyToMessage':
            emit('update:replyToEventId', eventId)
            break
        case 'deleteMessage':
            if (isShiftKeyPressed.value) {
                redactEvent(props.room.roomId, eventId)
            } else {
                deleteMessageConfirmEventRenderInfo.value = undefined

                findEventRenderInfo:
                for (const chunk of eventChunkBuffers.value[activeEventChunkBufferIndex.value]!) {
                    for (const e of chunk.events) {
                        if (e.event.eventId === messageActionsContextMenuTargetEventId.value) {
                            deleteMessageConfirmEventRenderInfo.value = e
                            break findEventRenderInfo
                        }
                    }
                }

                deleteMessageConfirmVisible.value = true
            }
            break
        case 'copyMessageId':
            try {
                if (!navigator.clipboard) throw new Error('Clipboard API missing.')
                await navigator.clipboard.writeText(eventId)
                toast.add({ severity: 'success', summary: t('room.copyMessageIdConfirm', { eventId }), life: 3000 })
            } catch (error) {
                toast.add({ severity: 'error', summary: t('room.clipboardApiNotSupported'), life: 4000 })
            }
            break
    }
}

function resetMessageActionsContextMenuTargetEventId() {
    messageActionsContextMenuTargetEventId.value = undefined
    keepMessageActionsContextMenuTargetEventId.value = false
}

function showMoreMessageActions(event: MouseEvent) {
    if (!moreMessageActionsContextMenu.value) return
    if (messageActionsContextMenuTargetEventId.value) {
        moreMessageActionsContextMenu.value.hide()
    } else {
        messageActionsContextMenuTargetEventId.value = messageActionsTargetEventId.value
        messageActionsContextMenuTargetEventSender.value = messageActionsTargetEventSender.value
        moreMessageActionsContextMenu.value.show(event)
    }
}

function onWheelMessageActionsContainer(e: WheelEvent) {
    e.preventDefault()
    scrollPanelContent.value?.scrollBy({
        left: e.deltaX,
        top: e.deltaY,
        behavior: 'auto',
    })
}

function onHideMoreMessageActionsContextMenu() {
    requestAnimationFrame(() => {
        if (!keepMessageActionsContextMenuTargetEventId.value) {
            messageActionsContextMenuTargetEventId.value = undefined
        }
    })
}

function onMouseOverTimeline(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (isTouchEventsDetected.value || !target?.getAttribute || messageActionsContainer.value?.contains(target)) return
    const eventElement = target?.closest('[data-event-id]')
    const eventId = eventElement?.getAttribute('data-event-id')
    const eventSender = eventElement?.getAttribute('data-event-sender') ?? ''
    if (eventId) {
        messageActionsTargetElement.value = eventElement as HTMLElement
        messageActionsTargetEventId.value = eventId
        messageActionsTargetEventSender.value = eventSender
        nextTick(() => {
            updateMessageActionsFloating()
        })
    } else {
        messageActionsTargetElement.value = undefined
        messageActionsTargetEventId.value = undefined
    }
}

function onMouseLeaveTimeline(event: MouseEvent) {
    messageActionsTargetElement.value = undefined
    messageActionsTargetEventId.value = undefined
}

/*------------------------------------*\
|                                      |
|   Handle Interaction with Timeline   |
|                                      |
\*------------------------------------*/

let pointerDownTimelineTarget: HTMLElement | null
let pointerDownTimelineItemX: number = 0
let pointerDownTimelineItemY: number = 0
let pointerDownTimelineTimestamp: number = 0

function onPointerDownTimeline(event: PointerEvent) {
    if (event.button === 0) {
        pointerDownTimelineTarget = event.target as HTMLElement
        pointerDownTimelineItemX = event.pageX
        pointerDownTimelineItemY = event.pageY
        pointerDownTimelineTimestamp = window.performance.now()
    }
}

function onPointerUpTimeline(event: PointerEvent) {
    // "Click" / "Tap" simulation. Need to do this because of the Safari "double tap with hover states" issue.
    if (
        event.button === 0
        && event.target && event.target === pointerDownTimelineTarget
        && window.performance.now() - pointerDownTimelineTimestamp <= settings.pointerClickTimeout
        && Math.abs(event.pageX - pointerDownTimelineItemX) < settings.pointerMoveRadius
        && Math.abs(event.pageY - pointerDownTimelineItemY) < settings.pointerMoveRadius
    ) {
        const link = (event.target as HTMLElement)?.closest('a[href],[data-link-id],[data-mx-spoiler]')
        if (!link) return
        if (link.getAttribute('data-mx-spoiler') != null && link.getAttribute('aria-expanded') != 'true') {
            link.setAttribute('aria-expanded', 'true')
            return
        }
        const href = link.getAttribute('href')
        if (link.tagName === 'A' && href) {
            if (href.startsWith('https://matrix.to/#/!')) {
                const [roomId, eventId] = href.replace('https://matrix.to/#/', '').split('/')
                if (roomId === props.room.roomId) {
                    jumpToMessage(eventId)
                } else {
                    // TODO - handle event redirect click
                }
            } else if (href.startsWith('https://matrix.to/#/@')) {
                const userId = href.replace('https://matrix.to/#/', '')
                showUserProfile(event, userId)
            } else {
                window.open(href, '_blank')
            }
            return
        }
        const linkId = link.getAttribute('data-link-id')
        const eventId = link.closest('[data-event-id]')?.getAttribute('data-event-id') ?? undefined
        switch (linkId) {
            case 'addReaction':
                const reactionKey = link.getAttribute('data-reaction-key')
                if (reactionKey) {
                    if (!eventId) return
                    emit('toggleEmoji', {
                        emoji: reactionKey,
                        description: '',
                        codes: [],
                    }, eventId)
                } else {
                    if (eventId) {
                        messageActionsContextMenuTargetEventId.value = eventId
                    }
                    runMoreMessageActionsContextMenuCommand({
                        originalEvent: event,
                        item: { key: 'addReaction' },
                    })
                }
                return
            case 'editGroup':
                editGroupDialogVisible.value = true
                return
            case 'editMessage':
                emit('update:editEventId', eventId ?? messageActionsTargetEventId.value)
                return
            case 'fixDecrypt':
                fixDecryptEventId.value = eventId
                fixDecryptDialogVisible.value = true
                return
            case 'jumpToMessage':
                const jumpToEventId = link.getAttribute('data-jump-to-event-id')
                if (!jumpToEventId) return
                jumpToMessage(jumpToEventId)
                return
            case 'replyToMessage':
                emit('update:replyToEventId', eventId ?? messageActionsTargetEventId.value)
                return
            case 'retrySendMessage':
                emit('retrySendMessage', eventId)
                return
            case 'viewUserProfile':
                const userId = link.getAttribute('data-user-id')
                if (!userId) return
                showUserProfile(event, userId)
                return
            default:
                break
        }
        const userId = link.getAttribute('data-user-id')
        if (userId) {
            // TODO - open user modal
        }
    }
}

function onClickTimeline(event: MouseEvent) {
    event.preventDefault()
}

function viewPhoto(event: ApiV3SyncClientEventWithoutRoomId<EventImageContent>) {
    photoViewerImageEvent.value = event
    photoViewerVisible.value = true
}

/*------------------------*\
|                          |
|   User Profile Popover   |
|                          |
\*------------------------*/

const userProfilePopover = ref<InstanceType<typeof UserProfilePopover>>()
const viewingProfileForUserId = ref<string>()

function showUserProfile(event: Event, userId: string) {
    viewingProfileForUserId.value = userId
    userProfilePopover.value?.show(event)
}

/*-------------------*\
|                     |
|   Jump to Message   |
|                     |
\*-------------------*/

const highlightEventId = ref<string | undefined>()
let highlightEventTimeoutHandle: number | undefined = undefined

const messagePreviewEvent = ref<ApiV3SyncClientEventWithoutRoomId>()
const messagePreviewDialogVisble = ref<boolean>(false)

async function jumpToMessage(eventId?: string) {
    if (!eventId || !scrollPanelContent.value || !scrollContentContainer.value) return

    const renderedEvent = scrollContentContainer.value.querySelector<HTMLDivElement>(`[data-event-id="${eventId}"]`)
    if (renderedEvent) {
        scrollPanelContent.value.scrollTop = Math.max(0, renderedEvent.offsetTop + (renderedEvent.offsetHeight / 2) - (scrollPanelContent.value.offsetHeight / 2))
        highlightEventId.value = eventId

        clearTimeout(highlightEventTimeoutHandle)
        highlightEventTimeoutHandle = setTimeout(() => {
            highlightEventId.value = undefined
        }, 5000)
    } else {
        const eventIndex = getTimelineEventIndexById(props.room.visibleTimeline, eventId)
        if (eventIndex != null) {
            offsetEventId.value = eventId
            offsetChunk.value = Math.round(chunksPerView / 2)
            highlightEventId.value = eventId
            props.room.nonSequentialUpdateUuid = uuidv4()

            clearTimeout(highlightEventTimeoutHandle)
            highlightEventTimeoutHandle = setTimeout(() => {
                highlightEventId.value = undefined
            }, 5000)
        } else {
            try {
                messagePreviewEvent.value = await getMessageEvent(props.room.roomId, eventId)
                if (!messagePreviewEvent.value) throw new Error('Missing message')
                messagePreviewDialogVisble.value = true
            } catch (error) {
                toast.add({ severity: 'error', summary: t('messagePreviewDialog.unableToView'), life: 5000 })
            }
        }
    }
}

/*--------------*\
| Expose Methods |
\*--------------*/

defineExpose({
    resetMessageActionsContextMenuTargetEventId,
    scrollToBottom,
})

</script>

<style lang="scss" scoped>
.p-chattimeline:deep(.p-scrollpanel-content-container) {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
}
.p-chattimeline:deep(.p-scrollpanel-content) {
    padding-right: 0 !important;
    padding-bottom: 1.75rem !important;
    height: auto;
    max-height: calc(100% + calc(2 * var(--p-scrollpanel-bar-size)));
    width: 100% !important;
    max-width: 100% !important;
}
.p-chattimeline:deep(.p-scrollpanel-bar.p-scrollpanel-bar-y) {
    margin-left: -0.125rem;
}

.timeline-events__message-actions {
    display: flex;
    position: absolute;
    padding: 0.125rem;
    background: var(--background-surface-high);
    border: 1px solid var(--border-muted);
    border-radius: 0.5rem;
    box-shadow: var(--shadow-low);
    width: max-content;
    top: 0;
    left: auto !important;
    right: 0.5rem !important;
    z-index: 5;

    > .p-button {
        padding: 0.125rem !important;
        width: 1.75rem !important;
        height: 1.75rem !important;
    }
}
</style>