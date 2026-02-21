import type { useRoomStore } from '@/stores/room'
import type { InvitedRoom, KnockedRoom, JoinedRoom, LeftRoom } from '@/types'

/** Get the room name, if defined. */
export function getRoomName(
    room: InvitedRoom | KnockedRoom | JoinedRoom | LeftRoom
): string | undefined {
    return room.stateEventsByType['m.room.name']?.[0]?.content.name
}

/** Get the top-most space. */
export function getTopLevelSpace(
    room: InvitedRoom | KnockedRoom | JoinedRoom | LeftRoom,
    store: ReturnType<typeof useRoomStore>
): InvitedRoom | KnockedRoom | JoinedRoom | LeftRoom | undefined {
    let spaceParent = room;
    for (let i = 0; i < 10; i++) { // Not going to search forever. Infinite loops are possible.
        const spaceParentEvent = spaceParent.stateEventsByType['m.space.parent']?.[0]
        const parentRoomId = spaceParentEvent?.stateKey
        if (!parentRoomId) break
        if (store.invited[parentRoomId]) {
            spaceParent = store.invited[parentRoomId]
        } else if (store.knocked[parentRoomId]) {
            spaceParent = store.knocked[parentRoomId]
        } else if (store.joined[parentRoomId]) {
            spaceParent = store.joined[parentRoomId]
        } else if (store.left[parentRoomId]) {
            spaceParent = store.left[parentRoomId]
        } 
    }
    const roomCreateEvent = spaceParent.stateEventsByType['m.room.create']?.[0]
    if (!roomCreateEvent) return undefined
    return roomCreateEvent?.content?.type === 'm.space' ? spaceParent : undefined
}

/** The provided room is a space. */
export function isRoomASpace(room: InvitedRoom | KnockedRoom | JoinedRoom | LeftRoom) {
    const roomCreateEvent = room.stateEventsByType['m.room.create']?.[0]
    if (!roomCreateEvent) return false
    return roomCreateEvent?.content?.type === 'm.space'
}

/** Either the room is a space, or is inside of one. */
export function isRoomPartOfSpace(room: InvitedRoom | KnockedRoom | JoinedRoom | LeftRoom) {
    const roomCreateEvent = room.stateEventsByType['m.room.create']?.[0]
    const spaceParentEvent = room.stateEventsByType['m.space.parent']?.[0]
    if (!roomCreateEvent) return false
    if (roomCreateEvent?.content?.type === 'm.space') return true
    return !!spaceParentEvent
}
