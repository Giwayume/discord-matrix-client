import { computed } from 'vue'
import { defineStore, storeToRefs } from 'pinia'

import { useRoomStore } from '@/stores/room'

interface SpaceSummary {
    avatarUrl?: string;
    creator: string;
    name: string;
    roomVersion: string;
}

export const useSpaceStore = defineStore('space', () => {
    const { joined } = storeToRefs(useRoomStore())

    const joinedSpaces = computed<SpaceSummary[]>(() => {
        const joinedSpaces: SpaceSummary[] = []
        for (const roomId in joined.value) {
            const room = joined.value[roomId]
            if (!room) continue
            const roomAvatarEvent = room.stateEventsByType['m.room.avatar']?.[0]
            const roomCreateEvent = room.stateEventsByType['m.room.create']?.[0]
            const roomNameEvent = room.stateEventsByType['m.room.name']?.[0]
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