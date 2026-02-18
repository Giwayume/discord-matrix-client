import { computed } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import { findEvents } from '@/utils/event'

import { useSyncStore } from '@/stores/sync'

interface SpaceSummary {
    avatarUrl?: string;
    creator: string;
    name: string;
    roomVersion: string;
}

export const useSpaceStore = defineStore('space', () => {
    const { sync } = storeToRefs(useSyncStore())

    const joinedSpaces = computed<SpaceSummary[]>(() => {
        if (!sync.value.rooms?.join) return []
        const joinedSpaces: SpaceSummary[] = []
        for (const roomId in sync.value.rooms.join) {
            const room = sync.value.rooms.join[roomId]
            const [
                roomAvatarEvent,
                roomCreateEvent,
                roomNameEvent,
            ] = findEvents(room?.state?.events, ['m.room.avatar', 'm.room.create', 'm.room.name'] as const)
            if (roomCreateEvent?.content?.type !== 'm.space') continue
            const roomVersion = roomCreateEvent.content.roomVersion ?? '1'
            joinedSpaces.push({
                avatarUrl: roomAvatarEvent?.content?.info?.thumbnailUrl ?? roomAvatarEvent?.content?.url,
                creator: (
                    parseInt(roomVersion) >= 11
                        ? roomCreateEvent.sender
                        : roomCreateEvent.content.creator
                ) ?? '',
                name: roomNameEvent?.content.name ?? '',
                roomVersion,
            })
        }
        return joinedSpaces
    })

    return {
        joinedSpaces,
    }
})