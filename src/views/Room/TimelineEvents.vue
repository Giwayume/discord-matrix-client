<template>
    <div v-if="room" :data-timeline-id="componentUuid" class="p-chattimeline">
        <ScrollPanel ref="scrollPanel">
            <!-- <MessagePlaceholder /> -->
            <template v-for="chunk of visibleEventChunks" :key="chunk.id">
                <template v-for="e of chunk.events" :key="e.event.eventId">
                    <div v-if="e.currentDateDivider && e.event.type !== 'm.room.create'" class="p-chattimeline-date-heading">
                        <time datetime="e.isoTimestamp">{{ e.currentDateDivider }}</time>
                    </div>
                    <div
                        v-if="e.category === 'message'"
                        class="p-chattimeline-event"
                        :class="{ 'p-chattimeline-event-groupstart': e.displayHeader }"
                        :data-event-id="e.event.eventId"
                    >
                        <!-- Message type events (most common) -->
                        <template v-if="e.displayHeader">
                            <h3 class="p-chattimeline-event-header">
                                <span class="link" :data-user-id="e.event.sender" role="button" tabindex="0">{{ e.displayname }}</span>
                                <time :datetime="e.isoTimestamp">{{ e.headerTime }}</time>
                            </h3>
                            <div class="p-avatar p-avatar-circle p-avatar-chat">
                                <AuthenticatedImage :mxcUri="e.avatarUrl" type="thumbnail" :width="48" :height="48" method="scale">
                                    <template v-slot="{ src }">
                                        <img :src="src" class="w-full h-full">
                                    </template>
                                    <template #error>
                                        <span class="p-avatar-icon pi pi-user" />
                                    </template>
                                </AuthenticatedImage>
                            </div>
                        </template>
                        <template v-if="e.event.type === 'm.room.message'">
                            <!-- Message -->
                            <template v-if="e.event.content.msgtype === 'm.audio'">
                                <!-- Audio -->
                                {{ e.event.content.msgtype }}
                            </template>
                            <template v-else-if="e.event.content.msgtype === 'm.file'">
                                <!-- File -->
                                {{ e.event.content.msgtype }}
                            </template>
                            <template v-else-if="e.event.content.msgtype === 'm.image'">
                                <!-- Image -->
                                <AuthenticatedImage
                                    :mxcUri="e.event.content.url"
                                    :encryptedFile="e.event.content.info?.thumbnailFile || e.event.content.file"
                                    type="download"
                                >
                                    <template v-slot="{ src }">
                                        <img
                                            :src="src"
                                            :alt="e.event.content.body"
                                            class="p-chattimeline-event-image"
                                            tabindex="0"
                                            :style="{
                                                '--image-target-height': (e.event.content.info?.thumbnailInfo?.h || e.event.content.info?.h || 16) + 'px',
                                                '--image-aspect-ratio': (e.event.content.info?.thumbnailInfo?.w || e.event.content.info?.w || 16) / (e.event.content.info?.thumbnailInfo?.h || e.event.content.info?.h || 16),
                                            }"
                                            @click="viewPhoto(e.event)"
                                        >
                                    </template>
                                </AuthenticatedImage>
                            </template>
                            <template v-else-if="e.event.content.msgtype === 'm.sticker'">
                                <!-- Sticker -->
                                {{ e.event.content.msgtype }}
                            </template>
                            <template v-else-if="e.event.content.msgtype === 'm.text'">
                                <!-- Text -->
                                <div
                                    v-if="e.event.content.format === 'org.matrix.custom.html'"
                                    class="p-chattimeline-event-content"
                                    v-dompurify-html="e.event.content.formattedBody"
                                />
                                <div v-else class="p-chattimeline-event-content">{{ e.event.content.body }}</div>
                            </template>
                            <template v-else-if="e.event.content.msgtype === 'm.video'">
                                <!-- Video -->
                                {{ e.event.content.msgtype }}
                            </template>
                        </template>
                        <!-- Encrypted Event -->
                        <div v-else-if="e.event.type === 'm.room.encrypted'" class="text-(--channels-default)">
                            <span class="pi pi-exclamation-triangle mr-1 !text-sm" aria-hidden="true" />{{ i18nText.unableToDecryptMessage }}
                            <span class="link" role="button" tabindex="0">{{ i18nText.learnFixDecrypt }}</span>
                        </div>
                    </div>
                    <div
                        v-else-if="e.category === 'settings'"
                        class="p-chattimeline-event p-chattimeline-event-settings"
                        :class="{ 'p-chattimeline-event-groupstart': e.displayHeader }"
                        :data-event-id="e.event.eventId"
                    >
                        <!-- Settings type events (less common) -->
                        <template v-if="e.event.type === 'm.room.avatar'">
                            <!-- Chat room icon/avatar changed -->
                            <span class="p-chattimeline-event-icon pi pi-pencil" aria-hidden="true" />
                            <strong>
                                <span class="link" :data-user-id="e.event.sender" role="button" tabindex="0">{{ e.displayname }}</span>
                            </strong>
                            {{ i18nText.changedGroupIcon }}
                            <span class="link" role="button" tabindex="0" @click="editGroup">{{ i18nText.editGroupButton }}</span>
                            <time :datetime="e.isoTimestamp">{{ e.headerTime }}</time>
                        </template>
                        <template v-else-if="e.event.type === 'm.room.member'">
                            <!-- Member Join/Leave room -->
                            <span class="p-chattimeline-event-icon pi" :class="[e.event.content.membership === 'join' ? 'pi-arrow-right' : 'pi-info-circle']" aria-hidden="true" />
                            <span v-if="e.event.content.membership === 'join'" class="mr-1">
                                {{ i18nText.joinedTheRoomPrefix }}<strong><span class="link" :data-user-id="e.event.sender" role="button" tabindex="0">{{ e.displayname }}</span></strong>{{ i18nText.joinedTheRoomSuffix }}
                            </span>
                            <template v-else>
                                <strong class="mr-1">
                                    <span class="link" :data-user-id="e.event.sender" role="button" tabindex="0">{{ e.displayname }}</span>
                                </strong>
                                <span v-if="e.event.content.membership === 'leave'">{{ i18nText.leftTheRoom }}</span>
                                <span v-if="e.event.content.membership === 'ban'">{{ i18nText.bannedFromTheRoom }}</span>
                            </template>
                            <time :datetime="e.isoTimestamp">{{ e.headerTime }}</time>
                        </template>
                        <template v-else-if="e.event.type === 'm.room.name'">
                            <!-- Chat group name changed -->
                            <span class="p-chattimeline-event-icon pi pi-pencil" aria-hidden="true" />
                            <strong>
                                <span class="link" :data-user-id="e.event.sender" role="button" tabindex="0">{{ e.displayname }}</span>
                            </strong>
                            {{ i18nText.changedGroupNamePrefix }}<strong>{{ e.event.content.name }}</strong>{{ i18nText.changedGroupNameSuffix }}
                            <time :datetime="e.isoTimestamp">{{ e.headerTime }}</time>
                        </template>
                        <template v-else-if="e.event.type === 'm.room.encryption'">
                            <!-- Encryption Enabled -->
                             <span class="p-chattimeline-event-icon pi pi-lock" aria-hidden="true" />
                            {{ i18nText.roomEncryptionEnabled }}
                            <time :datetime="e.isoTimestamp">{{ e.headerTime }}</time>
                        </template>
                        <template v-else>
                            <!-- Unhandled Event Type -->
                            {{ e.event.type }}
                        </template>
                    </div>
                    <!-- Start of chat (least common) -->
                    <MessageBeginning
                        v-else-if="e.event.type === 'm.room.create'"
                        :room="props.room"
                    />
                </template>
            </template>
            
            <!-- New messages bar -->
            <!--div class="p-chattimeline-new-divider">
                <div class="p-chattimeline-new-divider-tag">New</div>
            </div-->
        </ScrollPanel>
        <EditGroup v-model:visible="editGroupDialogVisible" :roomId="props.room.roomId" />
        <PhotoViewer v-model:visible="photoViewerVisible" :imageEvent="photoViewerImageEvent" />
    </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, type PropType } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { v4 as uuidv4 } from 'uuid'

import { decryptMegolmEvent } from '@/utils/crypto'

import { useRooms } from '@/composables/rooms'
import { useCryptoKeysStore } from '@/stores/crypto-keys'
import { useProfileStore } from '@/stores/profile'
import { useRoomStore } from '@/stores/room'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
const EditGroup = defineAsyncComponent(() => import('./EditGroup.vue'))
import MessageBeginning from './MessageBeginning.vue'
import MessagePlaceholder from './MessagePlaceholder.vue'
const PhotoViewer = defineAsyncComponent(() => import('./PhotoViewer.vue'))

import ScrollPanel from 'primevue/scrollpanel'

import { type JoinedRoom, type ApiV3SyncClientEventWithoutRoomId, type EventImageContent } from '@/types'

interface EventWithRenderInfo {
    category: 'settings' | 'message' | 'unknown';
    currentDateDivider: string | undefined;
    displayHeader: boolean;
    displayname: string;
    headerTime: string;
    time: string;
    isoTimestamp: string;
    avatarUrl?: string;
    event: ApiV3SyncClientEventWithoutRoomId;
}

interface EventChunk {
    id: string;
    loading: boolean;
    events: EventWithRenderInfo[];
}

const { t } = useI18n()
const { profiles } = storeToRefs(useProfileStore())
const { getPreviousMessages } = useRooms()
const roomStore = useRoomStore()
const { decryptedRoomEvents } = storeToRefs(roomStore)
const { getTimelineEventIndexById } = useRoomStore()
const { roomKeys } = storeToRefs(useCryptoKeysStore())

const props = defineProps({
    room: {
        type: Object as PropType<JoinedRoom>,
        required: true,
    }
})

const componentUuid = uuidv4()

// Lists all known custom rendered events. The events we do not wish to display in the timeline are commented out.
const customEventTypes = [
    'm.room.create',
]

// Lists all known "setting-type" events. The events we do not wish to display in the timeline are commented out.
const settingsEventTypes = [
    // 'm.room.aliases',
    'm.room.avatar',
    // 'm.room.canonical_alias',
    'm.room.encryption',
    // 'm.room.guest_access',
    // 'm.room.history_visibility',
    // 'm.room.join_rules',
    'm.room.member',
    'm.room.name',
    'm.room.pinned_events',
    // 'm.room.power_levels',
    // 'm.room.related_groups',
    // 'm.room.server_acl',
    // 'm.room.third_party_invite',
    'm.room.tombstone',
    // 'm.room.topic',

    // msgtype for m.room.message
    'm.emote',
    'm.location',
    'm.notice',
    'm.poll.response',
    'm.poll.start',
    // 'm.reaction',
    // 'm.replace',
    'm.server_notice',
]
// Lists all known "message-type" events. The events we do not wish to display in the timeline are commented out.
const messageEventTypes = [
    'm.room.encrypted',
    'm.room.message',
    'm.sticker',

    // msgtype for m.room.message
    'm.audio',
    'm.file',
    'm.image',
    'm.poll.start',
    'm.sticker',
    'm.text',
    'm.video',
]
// Lists all known message types for "message-type" events. The events we do not wish to display in the timeline are commented out.
const messageEventMessageTypes = [
    'm.audio',
    'm.emote',
    'm.file',
    'm.image',
    'm.location',
    'm.notice',
    // 'm.reaction',
    // 'm.replace',
    'm.server_notice',
    'm.sticker',
    'm.text',
    'm.video',
]
const visibleMembershipStatuses = ['join', 'leave', 'ban']

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
}

const scrollPanel = ref<typeof ScrollPanel>()

const eventsPerChunk = 10
const chunksPerView = 10
const offsetEventId = ref<string | undefined>()
const offsetChunk = ref<number>(0) // Relative to offsetEventId. Negative numbers scroll up for older messages
const editGroupDialogVisible = ref<boolean>(false)
const photoViewerVisible = ref<boolean>(false)
const photoViewerImageEvent = ref<ApiV3SyncClientEventWithoutRoomId<EventImageContent> | undefined>()

function isEventVisible(event: ApiV3SyncClientEventWithoutRoomId) {
    if (
        !settingsEventTypes.includes(event.type)
        && !messageEventTypes.includes(event.type)
        && !customEventTypes.includes(event.type)
    ) return false
    if (event.type === 'm.room.member') {
        if (!visibleMembershipStatuses.includes(event.content.membership)) return false
    } else if (event.type === 'm.room.message') {
        console.log(event.content)
        if (!messageEventMessageTypes.includes(event.content.msgtype)) return false
    }
    return true
}

const visibleEventChunks = computed<EventChunk[]>(() => {
    const today = new Date()
    const chunks: EventChunk[] = []
    const offsetEventIndex = getTimelineEventIndexById(props.room, offsetEventId.value) ?? props.room.timeline.length - 1

    let previousEvent: ApiV3SyncClientEventWithoutRoomId | undefined = undefined
    let currentDateDividerTs: number = 0
    for (let currentChunk = offsetChunk.value - chunksPerView; currentChunk <= offsetChunk.value; currentChunk += 1) {
        const currentChunkBottomEventIndex = offsetEventIndex + (currentChunk * eventsPerChunk)

        const chunk: EventChunk = {
            id: `${offsetEventId.value}::${offsetChunk.value + currentChunk}`,
            loading: true, // TODO - wait for network calls
            events: [],
        }

        const eventSlice = props.room.timeline.slice(
            Math.max(0, currentChunkBottomEventIndex + 1 - eventsPerChunk), Math.max(0, currentChunkBottomEventIndex + 1)
        )
        for (const event of eventSlice) {
            if (!isEventVisible(event)) continue

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
            chunk.events.push({
                category,
                currentDateDivider,
                displayHeader: previousEvent?.sender !== event.sender || category !== previousCategory || !!currentDateDivider,
                displayname: profiles.value[event.sender]?.displayname ?? event.sender,
                headerTime: isToday
                    ? originDate.toLocaleString(undefined, { hour: 'numeric', minute: 'numeric' })
                    : originDate.toLocaleString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }),
                time: originDate.toLocaleString(undefined, { hour: 'numeric', minute: 'numeric' }),
                isoTimestamp: originDate.toISOString(),
                avatarUrl: profiles.value[event.sender]?.avatarUrl,
                event,
            })

            previousEvent = event
            currentDateDividerTs = event.type === 'm.room.create' ? 0 : (event.originServerTs > currentDateDividerTs ? event.originServerTs : currentDateDividerTs)
        }

        const decryptPromises: Promise<void>[] = []
        for (const event of chunk.events) {
            if (event.event.type === 'm.room.encrypted') {
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
            chunk.loading = false
        })
        chunks.push(chunk)
    }
    return chunks
})

onMounted(() => {

    // if (scrollPanel.value) {
    //     const scrollPanelContent = (scrollPanel.value as any).$el?.querySelector('.p-scrollpanel-content')
    //     console.log(scrollPanelContent)
    //     scrollPanelContent?.scrollTo(0, 9999)
    // }
    // console.log(scrollPanel.value)

    // TODO - update to latest message whenever scrolled to bottom (live view)
    if (props.room.timeline.length > 0) {
        offsetEventId.value = props.room.timeline[props.room.timeline.length - 1]?.eventId
    }

    // TODO - remove, this is just a test. This function should be triggered by what's actually visible.
    if (props.room.timeline.length < 30) {
        getPreviousMessages(props.room.roomId)
        // TODO - how to handle error scenarios:
        // 400/404 M_NOT_FOUND
        // 400 M_LIMIT_EXCEEDED
        // 403 M_FORBIDDEN
        // May need to reset sync in some cases if can't request more message history. Prompt user?
    }

})

onUnmounted(() => {
    window.dispatchEvent(new CustomEvent('discortix-timeline-unmounted', { detail: { id: componentUuid } }))
})

function editGroup() {
    editGroupDialogVisible.value = true
}

function viewPhoto(event: ApiV3SyncClientEventWithoutRoomId<EventImageContent>) {
    photoViewerImageEvent.value = event
    photoViewerVisible.value = true
}

</script>

<style lang="scss" scoped>
.p-chattimeline:deep(.p-scrollpanel-content-container) {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
}
.p-chattimeline:deep(.p-scrollpanel-content) {
    padding-bottom: 1.75rem;
    height: auto;
    max-height: calc(100% + calc(2 * var(--p-scrollpanel-bar-size)));
}
</style>