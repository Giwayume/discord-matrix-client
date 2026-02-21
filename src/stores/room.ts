import { computed, ref, toRaw } from 'vue'
import { defineStore } from 'pinia'
import { redactEvent } from '@/utils/event'

import { useBroadcast } from '@/composables/broadcast'

import {
    loadTableKey as loadDiscortixTableKey,
    saveTableKey as saveDiscortixTableKey,
} from '@/stores/database/discortix'

import {
    eventContentSchemaByType,
    type ApiV3SyncAccountDataEvent,
    type ApiV3SyncClientEventWithoutRoomId,
    type ApiV3SyncStrippedStateEvent,
    type ApiV3SyncResponse,
    type ApiV3SyncLeftRoom,
    type ApiV3SyncRoomSummary,
    type EventRoomRedactionContent,
} from '@/types'

interface RoomSummary {
    avatarUrl?: string;
    creator: string;
    heroes: string[];
    id: string;
    joinedMemberCount: number;
    name: string;
    roomVersion: string;
}

interface RoomTimelineEvent {
    // ???
}

type EventDataRecordFrom<
    M extends Record<string, any>
> = {
    [K in string]: K extends keyof M ? M[K] : any;
};

type ApiV3SyncStrippedStateEventRecordFrom<
    M extends Record<string, any>
> = {
    [K in string]: ApiV3SyncStrippedStateEvent<
        K extends keyof M ? M[K] : any
    >[];
};

type ApiV3SyncClientEventWithoutRoomIdRecordFrom<
    M extends Record<string, any>
> = {
    [K in string]: ApiV3SyncClientEventWithoutRoomId<
        K extends keyof M ? M[K] : any
    >[];
};

interface ReadReceipt {
    eventId: string;
    threadId?: string;
    ts?: number;
}

interface InvitedRoom {
    stateEventsByType: ApiV3SyncStrippedStateEventRecordFrom<typeof eventContentSchemaByType>;
}

interface KnockedRoom {
    stateEventsByType: ApiV3SyncStrippedStateEventRecordFrom<typeof eventContentSchemaByType>;
}

interface JoinedRoom {
    accountData: EventDataRecordFrom<typeof eventContentSchemaByType>;
    readRecepts: Record<string, ReadReceipt>;
    stateEventsById: Record<string, ApiV3SyncClientEventWithoutRoomId>;
    stateEventsByType: ApiV3SyncClientEventWithoutRoomIdRecordFrom<typeof eventContentSchemaByType>;
    summary: ApiV3SyncRoomSummary;
    timeline: Array<RoomTimelineEvent>;
    typingUserIds: string[];
    unreadNotifications: {
        highlightCount: number;
        notificationCount: number;
    };
    unreadThreadNotifications: Record<string, {
        highlightCount: number;
        notificationCount: number;
    }>;
}

interface LeftRoom {
    accountData: EventDataRecordFrom<typeof eventContentSchemaByType>;
    stateEventsById: Record<string, ApiV3SyncClientEventWithoutRoomId>;
    stateEventsByType: ApiV3SyncClientEventWithoutRoomIdRecordFrom<typeof eventContentSchemaByType>;
    timeline: Array<RoomTimelineEvent>;
}

function isRoomStateEventType(type: string) {
    return /^(m\.room|m\.space)/.test(type)
}

function getRoomStateEventsByType(room: InvitedRoom, type: string): ApiV3SyncStrippedStateEvent[];
function getRoomStateEventsByType(room: KnockedRoom, type: string): ApiV3SyncStrippedStateEvent[];
function getRoomStateEventsByType(room: JoinedRoom, type: string): ApiV3SyncClientEventWithoutRoomId[];
function getRoomStateEventsByType(room: LeftRoom, type: string): ApiV3SyncClientEventWithoutRoomId[];
function getRoomStateEventsByType(room: any, type: string) {
    let eventsByType = room.stateEventsByType[type]
    if (!eventsByType) {
        eventsByType = []
        room.stateEventsByType[type] = eventsByType
    }
    return eventsByType
}

function addInvitedRoomStateEvent(room: InvitedRoom, event: ApiV3SyncStrippedStateEvent) {
    const eventContentParse = eventContentSchemaByType[event.type as keyof typeof eventContentSchemaByType]?.safeParse(event.content)
    if (!eventContentParse?.success) return

    const eventsByType = getRoomStateEventsByType(room, event.type)

    // Remove existing event based on type.
    const outdatedEventIndices = eventsByType.reduce((accumulator, currentValue, currentIndex) => {
        if (currentValue.stateKey === event.stateKey) {
            accumulator.push(currentIndex)
        }
        return accumulator
    }, [] as number[])
    for (let i = outdatedEventIndices.length - 1; i >= 0; i--) {
        const indexInEventTypeArray = outdatedEventIndices[i]
        if (indexInEventTypeArray == null) continue
        eventsByType.splice(indexInEventTypeArray, 1)
    }
    
    // Add new state event.
    eventsByType.push(event)
}

function addKnockedRoomStateEvent(room: KnockedRoom, event: ApiV3SyncStrippedStateEvent) {
    const eventContentParse = eventContentSchemaByType[event.type as keyof typeof eventContentSchemaByType]?.safeParse(event.content)
    if (!eventContentParse?.success) return

    const eventsByType = getRoomStateEventsByType(room, event.type)

    // Remove existing event based on type.
    const outdatedEventIndices = eventsByType.reduce((accumulator, currentValue, currentIndex) => {
        if (currentValue.stateKey === event.stateKey) {
            accumulator.push(currentIndex)
        }
        return accumulator
    }, [] as number[])
    for (let i = outdatedEventIndices.length - 1; i >= 0; i--) {
        const indexInEventTypeArray = outdatedEventIndices[i]
        if (indexInEventTypeArray == null) continue
        eventsByType.splice(indexInEventTypeArray, 1)
    }
    
    // Add new state event.
    eventsByType.push(event)
}

function addJoinedOrLeftRoomStateEvent(room: JoinedRoom | LeftRoom, event: ApiV3SyncClientEventWithoutRoomId) {
    const eventContentParse = eventContentSchemaByType[event.type as keyof typeof eventContentSchemaByType]?.safeParse(event.content)
    if (!eventContentParse?.success) return
    
    const eventsByType = getRoomStateEventsByType(room, event.type)

    // Redact existing event.
    if (event.type === 'm.room.redaction') {
        const redactionId = (event.content as EventRoomRedactionContent).redacts
        if (redactionId) {
            const redactedEvent = room.stateEventsById[redactionId]
            if (redactedEvent) {
                redactEvent(redactedEvent)
            }
        }
    }

    // If an event exists with the same event ID, remove it.
    const eventIdIndex = eventsByType.findIndex((otherEvent) => otherEvent.eventId === (event as ApiV3SyncClientEventWithoutRoomId).eventId)
    if (eventIdIndex > -1) {
        eventsByType.splice(eventIdIndex, 1)
        delete room.stateEventsById[eventIdIndex]
    }

    // Remove existing event based on type / eventId.
    const replaceEventId = event.unsigned?.replacesState
    if (replaceEventId) {
        const eventIdIndex = eventsByType.findIndex((otherEvent) => otherEvent.eventId === replaceEventId)
        if (eventIdIndex > -1) {
            eventsByType.splice(eventIdIndex, 1, event)
        }
        delete room.stateEventsById[replaceEventId]
    } else {
        const outdatedEventIndices = eventsByType.reduce((accumulator, currentValue, currentIndex) => {
            if (currentValue.stateKey === event.stateKey) {
                accumulator.push(currentIndex)
            }
            return accumulator
        }, [] as number[])
        for (let i = outdatedEventIndices.length - 1; i >= 0; i--) {
            const indexInEventTypeArray = outdatedEventIndices[i]
            if (eventsByType[i]?.eventId) {
                delete room.stateEventsById[eventsByType[i]!.eventId!]
            }
            if (indexInEventTypeArray != null) {
                eventsByType.splice(indexInEventTypeArray, 1)
            }
        }
    }

    // Add new state event.
    eventsByType.push(event)
    room.stateEventsById[event.eventId] = event
}

function addAccountDataEvent(room: JoinedRoom | LeftRoom, event: ApiV3SyncAccountDataEvent) {
    const eventContentParse = eventContentSchemaByType[event.type as keyof typeof eventContentSchemaByType]?.safeParse(event.content)
    if (!eventContentParse?.success) return
    room.accountData[event.type] = event.content
}

function populateEphemeralRoomEvents(room: JoinedRoom, events: Array<{ content: any; type: string; }>) {
    for (const event of events) {
        if (event.type === 'm.receipt') {
            const eventContentParse = eventContentSchemaByType['m.receipt']?.safeParse(event.content)
            if (!eventContentParse?.success) continue
            for (const eventId in eventContentParse.data) {
                const mRead = eventContentParse.data[eventId]?.['m.read'] ?? {}
                for (const userId in mRead) {
                    room.readRecepts[userId] = {
                        eventId,
                        ts: mRead[userId]?.ts,
                        threadId: mRead[userId]?.threadId,
                    }
                }
            }
        } else if (event.type === 'm.typing') {
            const eventContentParse = eventContentSchemaByType['m.typing']?.safeParse(event.content)
            if (!eventContentParse?.success) continue
            room.typingUserIds = eventContentParse.data.userIds
        }
    }
}

export const useRoomStore = defineStore('room', () => {
    const { isLeader } = useBroadcast()

    const roomsLoading = ref<boolean>(true)
    const roomsLoadError = ref<Error | null>(null)

    const invited = ref<Record<string, InvitedRoom>>({})
    const knocked = ref<Record<string, KnockedRoom>>({})
    const joined = ref<Record<string, JoinedRoom>>({})
    const left = ref<Record<string, LeftRoom>>({})

    async function initialize() {
        try {
            await Promise.all([
                loadDiscortixTableKey('rooms', 'invited').then((invitedRooms) => {
                    if (!invitedRooms) throw new DOMException('Invited rooms not found in database.', 'NotFoundError')
                    invited.value = invitedRooms
                }),
                loadDiscortixTableKey('rooms', 'knocked').then((knockedRooms) => {
                    if (!knockedRooms) throw new DOMException('Knocked rooms not found in database.', 'NotFoundError')
                    knocked.value = knockedRooms
                }),
                loadDiscortixTableKey('rooms', 'joined').then((joinedRooms) => {
                    if (!joinedRooms) throw new DOMException('Joined rooms not found in database.', 'NotFoundError')
                    joined.value = joinedRooms
                }),
                loadDiscortixTableKey('rooms', 'left').then((leftRooms) => {
                    if (!leftRooms) throw new DOMException('Left rooms not found in database.', 'NotFoundError')
                    left.value = leftRooms
                }),
            ])
        } catch (error) {
            roomsLoadError.value = error as Error
        }
        roomsLoading.value = false
    }
    initialize()

    async function populateFromApiV3SyncResponse(sync: ApiV3SyncResponse) {
        if (!sync.rooms) return

        let touchedRoomTypes: Set<'invited' | 'knocked' | 'joined' | 'left'> = new Set()

        // Populate invited room state
        if (sync.rooms.invite) {
            touchedRoomTypes.add('invited')
            for (const roomId in sync.rooms.invite) {
                const invitedRoomsSync = sync.rooms.invite[roomId]
                if (!invitedRoomsSync) continue

                if (!invited.value[roomId]) {
                    invited.value[roomId] = {
                        stateEventsByType: {},
                    }
                }

                if (knocked.value[roomId]) {
                    delete knocked.value[roomId]
                    touchedRoomTypes.add('knocked')
                }
                if (joined.value[roomId]) {
                    delete joined.value[roomId]
                    touchedRoomTypes.add('joined')
                }
                if (left.value[roomId]) {
                    delete left.value[roomId]
                    touchedRoomTypes.add('left')
                }

                if (invitedRoomsSync.inviteState?.events) {
                    for (const stateEvent of invitedRoomsSync.inviteState.events) {
                        addInvitedRoomStateEvent(invited.value[roomId], stateEvent)
                    }
                }
            }
        }

        // Populate knocked room state
        if (sync.rooms.knock) {
            touchedRoomTypes.add('knocked')
            for (const roomId in sync.rooms.knock) {
                const knockedRoomsSync = sync.rooms.knock[roomId]
                if (!knockedRoomsSync) continue

                if (!knocked.value[roomId]) {
                    knocked.value[roomId] = {
                        stateEventsByType: {},
                    }
                }

                if (invited.value[roomId]) {
                    delete invited.value[roomId]
                    touchedRoomTypes.add('invited')
                }
                if (joined.value[roomId]) {
                    delete joined.value[roomId]
                    touchedRoomTypes.add('joined')
                }
                if (left.value[roomId]) {
                    delete left.value[roomId]
                    touchedRoomTypes.add('left')
                }

                if (knockedRoomsSync.knockState?.events) {
                    for (const stateEvent of knockedRoomsSync.knockState.events) {
                        addKnockedRoomStateEvent(knocked.value[roomId], stateEvent)
                    }
                }
            }
        }

        // Populate joined room state
        if (sync.rooms.join) {
            touchedRoomTypes.add('joined')
            for (const roomId in sync.rooms.join) {
                const joinedRoomSync = sync.rooms.join[roomId]
                if (!joinedRoomSync) continue

                if (!joined.value[roomId]) {
                    joined.value[roomId] = {
                        accountData: left.value[roomId]?.accountData ?? {},
                        readRecepts: {},
                        stateEventsByType: {},
                        stateEventsById: {},
                        summary: {},
                        timeline: [],
                        typingUserIds: [],
                        unreadNotifications: { highlightCount: 0, notificationCount: 0 },
                        unreadThreadNotifications: {},
                    }
                }

                if (invited.value[roomId]) {
                    delete invited.value[roomId]
                    touchedRoomTypes.add('invited')
                }
                if (knocked.value[roomId]) {
                    delete knocked.value[roomId]
                    touchedRoomTypes.add('knocked')
                }
                if (left.value[roomId]) {
                    delete left.value[roomId]
                    touchedRoomTypes.add('left')
                }

                if (joinedRoomSync.accountData?.events) {
                    for (const accountDataEvent of joinedRoomSync.accountData.events) {
                        addAccountDataEvent(joined.value[roomId], accountDataEvent)
                    }
                }
                if (joinedRoomSync.ephemeral?.events) {
                    populateEphemeralRoomEvents(joined.value[roomId], joinedRoomSync.ephemeral.events)
                }
                if (joinedRoomSync.state?.events) {
                    for (const stateEvent of joinedRoomSync.state.events) {
                        addJoinedOrLeftRoomStateEvent(joined.value[roomId], stateEvent)
                    }
                }
                if (joinedRoomSync.summary) {
                    joined.value[roomId].summary = joinedRoomSync.summary
                }
                if (joinedRoomSync.timeline?.events) {
                    for (const timelineEvent of joinedRoomSync.timeline.events) {
                        if (isRoomStateEventType(timelineEvent.type)) {
                            addJoinedOrLeftRoomStateEvent(joined.value[roomId], timelineEvent)
                        }
                    }
                }
                if (joinedRoomSync.unreadNotifications) {
                    joined.value[roomId].unreadNotifications.highlightCount = joinedRoomSync.unreadNotifications.highlightCount ?? 0
                    joined.value[roomId].unreadNotifications.notificationCount = joinedRoomSync.unreadNotifications.notificationCount ?? 0
                }
                if (joinedRoomSync.unreadThreadNotifications) {
                    for (const threadId in joinedRoomSync.unreadThreadNotifications) {
                        if (!joined.value[roomId].unreadThreadNotifications[threadId]) {
                            joined.value[roomId].unreadThreadNotifications[threadId] = {
                                highlightCount: 0,
                                notificationCount: 0,
                            }
                        }
                        joined.value[roomId].unreadThreadNotifications[threadId].highlightCount = joinedRoomSync.unreadThreadNotifications[threadId]?.highlightCount ?? 0
                        joined.value[roomId].unreadThreadNotifications[threadId].notificationCount = joinedRoomSync.unreadThreadNotifications[threadId]?.notificationCount ?? 0
                    }
                }
            }
        }

        // Populate left room state
        if (sync.rooms.leave) {
            touchedRoomTypes.add('left')
            const leftRooms: Record<string, ApiV3SyncLeftRoom> = sync.rooms.leave ?? {}
            for (const roomId in leftRooms) {
                const leftRoomSync = leftRooms[roomId]
                if (!leftRoomSync) continue

                if (!left.value[roomId]) {
                    left.value[roomId] = {
                        accountData: joined.value[roomId]?.accountData ?? {},
                        stateEventsByType: {},
                        stateEventsById: {},
                        timeline: [],
                    }
                }

                if (invited.value[roomId]) {
                    delete invited.value[roomId]
                    touchedRoomTypes.add('invited')
                }
                if (knocked.value[roomId]) {
                    delete knocked.value[roomId]
                    touchedRoomTypes.add('knocked')
                }
                if (joined.value[roomId]) {
                    delete joined.value[roomId]
                    touchedRoomTypes.add('joined')
                }

                if (leftRoomSync.accountData?.events) {
                    for (const accountDataEvent of leftRoomSync.accountData.events) {
                        addAccountDataEvent(left.value[roomId], accountDataEvent)
                    }
                }
                if (leftRoomSync.state?.events) {
                    for (const stateEvent of leftRoomSync.state.events) {
                        addJoinedOrLeftRoomStateEvent(left.value[roomId], stateEvent)
                    }
                }
                if (leftRoomSync.timeline?.events) {
                    for (const timelineEvent of leftRoomSync.timeline.events) {
                        if (isRoomStateEventType(timelineEvent.type)) {
                            addJoinedOrLeftRoomStateEvent(left.value[roomId], timelineEvent)
                        }
                    }
                }
            }
        }

        if (isLeader.value) {
            if (touchedRoomTypes.has('invited')) {
                try {
                    await saveDiscortixTableKey('rooms', 'invited', toRaw(invited.value))
                } catch (error) {
                    localStorage.setItem('mx_full_sync_required', 'true')
                }
            }
            if (touchedRoomTypes.has('knocked')) {
                try {
                    await saveDiscortixTableKey('rooms', 'knocked', toRaw(knocked.value))
                } catch (error) {
                    localStorage.setItem('mx_full_sync_required', 'true')
                }
            }
            if (touchedRoomTypes.has('joined')) {
                try {
                    await saveDiscortixTableKey('rooms', 'joined', toRaw(joined.value))
                } catch (error) {
                    localStorage.setItem('mx_full_sync_required', 'true')
                }
            }
            if (touchedRoomTypes.has('left')) {
                try {
                    await saveDiscortixTableKey('rooms', 'left', toRaw(left.value))
                } catch (error) {
                    localStorage.setItem('mx_full_sync_required', 'true')
                }
            }
        }

    }

    // This includes one-on-one and group chats.
    const directMessageRooms = computed(() => {
        const rooms: RoomSummary[] = []
        for (const roomId in joined.value) {
            const room = joined.value[roomId]
            if (!room) continue
            const roomAvatarEvent = room.stateEventsByType['m.room.avatar']?.[0]
            const roomCreateEvent = room.stateEventsByType['m.room.create']?.[0]
            const roomNameEvent = room.stateEventsByType['m.room.name']?.[0]
            const roomMemberEvents = room.stateEventsByType['m.room.member'] ?? []
            const spaceParentEvent = room.stateEventsByType['m.space.parent']?.[0]

            if (!roomCreateEvent) continue
            if (roomCreateEvent?.content?.type === 'm.space') continue
            if (spaceParentEvent) continue
            const roomVersion = roomCreateEvent.content.roomVersion ?? '1'

            let heroes: string[] = room.summary?.['m.heroes'] ?? []
            let joinedMemberCount = room.summary?.['m.joined_member_count']
            if (heroes.length === 0 || !joinedMemberCount) {
                const memberJoinEvents = roomMemberEvents.filter(
                    (event) => event.sender && event.content.membership === 'join'
                )
                if (heroes.length === 0) {
                    heroes = memberJoinEvents.map((event) => event.sender ?? '')
                }
                if (!joinedMemberCount) {
                    joinedMemberCount = memberJoinEvents.length
                }
            }

            rooms.push({
                avatarUrl: roomAvatarEvent?.content?.info?.thumbnailUrl ?? roomAvatarEvent?.content?.url,
                creator: (
                    parseInt(roomVersion) >= 11
                        ? roomCreateEvent.sender
                        : roomCreateEvent.content.creator
                ) ?? '',
                heroes,
                id: roomId,
                joinedMemberCount,
                name: roomNameEvent?.content.name ?? '',
                roomVersion,
            })
        }
        return rooms
    })

    return {
        roomsLoading,
        roomsLoadError,
        invited: computed(() => invited.value),
        knocked: computed(() => knocked.value),
        joined: computed(() => joined.value),
        left: computed(() => left.value),
        directMessageRooms,
        populateFromApiV3SyncResponse,
    }
})