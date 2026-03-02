import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { defineStore, storeToRefs } from 'pinia'

import { getRoomAvatarUrl, getRoomName, getTopLevelSpace } from '@/utils/room'
import { useRoomStore } from '@/stores/room'

import type { InvitedRoom, JoinedRoom, KnockedRoom, LeftRoom, SpaceSummary } from '@/types'

export const useSpaceStore = defineStore('space', () => {
    const route = useRoute()
    const roomStore = useRoomStore()
    const { joined } = storeToRefs(roomStore)

    const currentTopLevelSpace = computed<JoinedRoom | InvitedRoom | KnockedRoom | LeftRoom | undefined>(() => {
        if (route.name !== 'room') return undefined
        const currentRoomId = `${route.params.roomId}`
        const currentRoom = joined.value[currentRoomId]
        if (!currentRoom) return undefined
        return getTopLevelSpace(currentRoom, roomStore)
    })

    const currentTopLevelSpaceId = computed<string | undefined>(() => {
        return currentTopLevelSpace.value?.roomId
    })

    const currentTopLevelSpaceName = computed<string | undefined>(() => {
        if (!currentTopLevelSpace.value) return undefined
        return getRoomName(currentTopLevelSpace.value)
    })

    const currentTopLevelSpaceAvatarUrl = computed<string | undefined>(() => {
        if (!currentTopLevelSpace.value) return undefined
        return getRoomAvatarUrl(currentTopLevelSpace.value)
    })

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
                roomId,
                roomVersion,
            })
        }
        return joinedSpaces
    })

    return {
        currentTopLevelSpaceId,
        currentTopLevelSpaceName,
        currentTopLevelSpaceAvatarUrl,
        joinedSpaces,
    }
})