<template>
    <div v-if="room" class="p-chattimeline">
        <ScrollPanel>
            <!-- <MessagePlaceholder /> -->

            <!-- <MessageBeginning
                :roomId="props.room.roomId"
                :otherMembers="otherMembersDisplayed"
                :roomAvatarUrl="roomAvatarUrl"
                :roomName="roomName"
                :isInsideSpace="isInsideSpace"
            /> -->
            
            <template v-for="chunk of visibleEventChunks" :key="chunk.id">
                <template v-for="e of chunk.events" :key="e.event.eventId">
                    <div class="p-chattimeline-event" :class="{ 'p-chattimeline-event-groupstart': e.displayHeader }">
                        <template v-if="e.displayHeader">
                            <h3 class="p-chattimeline-event-header">
                                <a href="javascript:void(0)">{{ e.displayname }}</a>
                                <time :datetime="e.isoTimestamp">{{ e.headerTime }}</time>
                            </h3>
                            <div class="p-avatar p-avatar-circle p-avatar-chat">
                                <AuthenticatedImage :mxcUri="e.avatarUrl" type="thumbnail" :width="48" :height="48" method="crop">
                                    <template v-slot="{ src }">
                                        <img :src="src" class="w-full h-full">
                                    </template>
                                    <template #error>
                                        <span class="p-avatar-icon pi pi-user" />
                                    </template>
                                </AuthenticatedImage>
                            </div>
                        </template>
                        <span v-if="e.event.type === 'm.room.encrypted'" class="text-(--channels-default)">
                            <span class="pi pi-exclamation-triangle mr-1 !text-sm" aria-hidden="true" />{{ i18nText.unableToDecryptMessage }}
                            <a href="javascript:void(0)">{{ i18nText.learnFixDecrypt }}</a>
                        </span>
                    </div>
                </template>
            </template>
            
            <!-- Date Heading -->
            <div class="p-chattimeline-date-heading">
                <time datetime="">February 21, 2026</time>
            </div>
            <!-- User Messages -->
            <div class="p-chattimeline-event">
                <h3 class="p-chattimeline-event-header">
                    <a href="javascript:void(0)">giwayume</a>
                    <time datetime="">3:52 PM</time>
                </h3>
                <div class="p-avatar p-avatar-circle p-avatar-chat">
                    <span class="p-avatar-icon pi pi-users" />
                </div>
                what is this
            </div>
            <div class="p-chattimeline-event">
                huh
                <time class="p-chattimeline-asidetime" datetime="">12:52 PM</time>
            </div>
            <div class="p-chattimeline-event">
                did i make this
                <time class="p-chattimeline-asidetime">3:52 PM</time>
            </div>
            <!-- New messages bar -->
            <div class="p-chattimeline-new-divider">
                <div class="p-chattimeline-new-divider-tag">New</div>
            </div>
            <!-- Change group icon -->
            <div class="p-chattimeline-event p-chattimeline-event-settings">
                <span class="p-chattimeline-event-icon pi pi-pencil" aria-hidden="true" />
                <strong><a href="javascript:void(0)">giwayume</a></strong> changed the group icon. <a href="javascript:void(0)">Edit Group</a>
                <time datetime="">3:52 PM</time>
            </div>
            <!-- Change group name -->
            <div class="p-chattimeline-event p-chattimeline-event-settings">
                <span class="p-chattimeline-event-icon pi pi-pencil" aria-hidden="true" />
                <strong><a href="javascript:void(0)">giwayume</a></strong> changed the group name: <strong>ong fanum's alpha rizzlers</strong>. <a href="javascript:void(0)">Edit Group</a>
                <time datetime="">3:52 PM</time>
            </div>
        </ScrollPanel>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, type PropType } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

import { useRooms } from '@/composables/rooms'
import { useProfileStore } from '@/stores/profile'
import { useRoomStore } from '@/stores/room'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
import MessagePlaceholder from './MessagePlaceholder.vue'

import ScrollPanel from 'primevue/scrollpanel'

import { type JoinedRoom, type ApiV3SyncClientEventWithoutRoomId } from '@/types'

interface EventWithRenderInfo {
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
const { getTimelineEventIndexById } = useRoomStore()

const props = defineProps({
    room: {
        type: Object as PropType<JoinedRoom>,
        required: true,
    }
})

// Caching i18n here, calculating in template for each item is extremely slow.
const i18nText = {
    unableToDecryptMessage: t('room.unableToDecryptMessage'),
    learnFixDecrypt: t('room.learnFixDecrypt'),
}

const eventsPerChunk = 10
const chunksPerView = 10
const offsetEventId = ref<string | undefined>()
const offsetChunk = ref<number>(0) // Relative to offsetEventId. Negative numbers scroll up for older messages

const visibleEventChunks = computed<EventChunk[]>(() => {
    const chunks: EventChunk[] = []
    const offsetEventIndex = getTimelineEventIndexById(props.room, offsetEventId.value) ?? props.room.timeline.length - 1
    for (let currentChunk = offsetChunk.value; currentChunk >= offsetChunk.value - chunksPerView; currentChunk -= 1) {
        const chunkBottomEventIndex = offsetEventIndex + (currentChunk * eventsPerChunk)
        const chunk: EventChunk = {
            id: `${offsetEventId.value}::${offsetChunk.value + currentChunk}`,
            loading: false, // TODO
            events: props.room.timeline.slice(
                Math.max(0,  chunkBottomEventIndex + 1 - eventsPerChunk), Math.max(0, chunkBottomEventIndex + 1)
            ).map((event, eventIndex) => {
                const previousEvent = props.room.timeline[chunkBottomEventIndex - eventsPerChunk + eventIndex]
                const originDate = new Date(event.originServerTs)
                return {
                    displayHeader: previousEvent?.sender !== event.sender,
                    displayname: profiles.value[event.sender]?.displayname ?? event.sender,
                    headerTime: originDate.toLocaleDateString(),
                    time: originDate.toLocaleString(undefined, { hour: 'numeric', minute: 'numeric' }),
                    isoTimestamp: originDate.toISOString(),
                    avatarUrl: profiles.value[event.sender]?.avatarUrl,
                    event,
                }
            }),
        }
        chunks.unshift(chunk)
    }
    return chunks
})

onMounted(() => {

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

</script>