import { computed, ref, toRaw } from 'vue'
import { useRoute } from 'vue-router'
import { defineStore, storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

import { useBroadcast } from '@/composables/broadcast'
import { useEventTimeline } from '@/composables/event-timeline'

import { useAccountDataStore } from './account-data'
import { useSessionStore } from '@/stores/session'

import {
    getAllTableKeys as getAllDiscortixTableKeys,
    deleteTableKey as deleteDiscortixTableKey,
    loadTableKey as loadDiscortixTableKey,
    saveTableKey as saveDiscortixTableKey,
} from '@/stores/database/discortix'

import {
    type RoomSummary,
    type InvitedRoom,
    type KnockedRoom,
    type JoinedRoom,
    type LeftRoom,
    eventContentSchemaByType,
    type ApiV3RoomMessagesResponse,
    type ApiV3SyncAccountDataEvent,
    type ApiV3SyncClientEventWithoutRoomId,
    type ApiV3SyncStrippedStateEvent,
    type ApiV3SyncResponse,
    type ApiV3SyncLeftRoom,
    type ApiV3SyncTimeline,
    type EventRoomRedactionContent,
} from '@/types'

const { isEventVisible, redactEvent } = useEventTimeline()

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

/** Merges event into the timeline in server timestamp order. Returns true if it was a duplicate event. */
function addJoinedOrLeftRoomTimelineEvent(
    room: JoinedRoom | LeftRoom,
    event: ApiV3SyncClientEventWithoutRoomId
): boolean {
    let timeline = isEventVisible(event) ? room.visibleTimeline : room.invisibleTimeline

    // Process redaction
    if (event.type === 'm.room.redaction') {
        const redactedEventId = event.content?.redacts
        const eventIndex = getTimelineEventIndexById(room.visibleTimeline, redactedEventId)
        if (eventIndex == -1 || eventIndex == null) {
            room.redactions.push(redactedEventId)
        } else {
            const redactedVisibleEvent = room.visibleTimeline.splice(eventIndex, 1)[0]
            if (redactedVisibleEvent) {
                redactEvent(redactedVisibleEvent)
                room.nonSequentialUpdateUuid = uuidv4()
            }

            const redactedInvisibleEvent = room.invisibleTimeline.splice(eventIndex, 1)[0]
            if (redactedInvisibleEvent) {

                removeReaction:
                if (redactedInvisibleEvent.type === 'm.reaction') {
                    const relatesTo = redactedInvisibleEvent.content?.['m.relates_to']
                    const relatedEventId: string | undefined = relatesTo?.eventId
                    const reactionKey: string | undefined = relatesTo?.key
                    if (!relatedEventId || !reactionKey || !room.reactions[relatedEventId]) break removeReaction
                    let reactionIndex = room.reactions[relatedEventId].findIndex(
                        (reaction) => reaction.key === reactionKey
                    )
                    const reaction = room.reactions[relatedEventId][reactionIndex]
                    if (!reaction) break removeReaction
                    const reactionEventIndex = reaction.events.findIndex(
                        (event) => event.eventId === redactedInvisibleEvent.eventId
                    )
                    const reactionEvent = reaction.events[reactionEventIndex]
                    if (!reactionEvent) break removeReaction
                    reaction.events.splice(reactionEventIndex, 1)
                    if (reaction.events.length === 0) {
                        room.reactions[relatedEventId].splice(reactionIndex, 1)
                    }
                    if (room.reactions[relatedEventId].length === 0) {
                        delete room.reactions[relatedEventId]
                    }
                }

                redactEvent(redactedInvisibleEvent)
                if (redactedInvisibleEvent.type !== 'm.room.redaction') {
                    addJoinedOrLeftRoomTimelineEvent(room, redactedInvisibleEvent)
                }
            }
        }
    } else if (room.redactions.includes(event.eventId)) {
        room.redactions.splice(room.redactions.indexOf(event.eventId), 1)
        redactEvent(event)
        timeline = room.invisibleTimeline
        room.nonSequentialUpdateUuid = uuidv4()
    }

    // Process reaction
    if (event.type === 'm.reaction') {
        const relatesTo = event.content?.['m.relates_to']
        const relatedEventId: string | undefined = relatesTo?.eventId
        const reactionKey: string | undefined = relatesTo?.key
        if (relatedEventId && reactionKey) { // Redacted reaction is missing these properties
            if (!room.reactions[relatedEventId]) {
                room.reactions[relatedEventId] = []
            }
            let reactionIndex = room.reactions[relatedEventId].findIndex(
                (reaction) => reaction.key === reactionKey
            )
            if (reactionIndex === -1) {
                room.reactions[relatedEventId].push({
                    key: reactionKey,
                    ts: event.originServerTs,
                    events: []
                })
                reactionIndex = 0
            }
            const reaction = room.reactions[relatedEventId][reactionIndex]
            if (reaction) {
                const existingEventIndex = reaction.events.findIndex((otherEvent) => otherEvent.sender === event.sender)
                if (existingEventIndex > -1) {
                    reaction.events.splice(existingEventIndex, 1)
                }
                reaction.events.push({
                    eventId: event.eventId,
                    sender: event.sender,
                })
                if (event.originServerTs < reaction.ts) {
                    reaction.ts = event.originServerTs
                }
            }
            room.reactions[relatedEventId].sort((a, b) => {
                return a.ts < b.ts ? -1 : 1
            })
        }
    }

    // Process message replacement
    if (event.type === 'm.room.message' && event.content?.['m.relates_to']?.relType === 'm.replace') {
        const relatedEventId: string | undefined = event.content?.['m.relates_to']?.eventId
        if (relatedEventId) {
            if (!room.replacements[relatedEventId]) {
                room.replacements[relatedEventId] = []
            }
            room.replacements[relatedEventId]!.push(event)
            room.replacements[relatedEventId].sort((a, b) => {
                return a.originServerTs < b.originServerTs ? 1 : -1 // Newest events first
            })
            room.nonSequentialUpdateUuid = uuidv4()
        }
    }

    // Remove event with same transaction ID
    if (event.unsigned?.transactionId) {
        const otherEventIndex = getTimelineEventIndexByTransactionId(timeline, event.unsigned.transactionId, 100)
        if (otherEventIndex != null) {
            timeline.splice(otherEventIndex, 1)
        }
    }

    // Remove event with duplicate ID
    const duplicateEventIndex = getTimelineEventIndexById(timeline, event.eventId, 100)
    if (duplicateEventIndex != null) {
        timeline.splice(duplicateEventIndex, 1)
    }

    // Insert event into timeline
    if (timeline.length === 0) {
        timeline.push(event)
        return false
    }
    let low = 0
    let high = timeline.length
    while (low < high) {
        const mid = (low + high) >>> 1
        const midEvent = timeline[mid]
        if (midEvent == null) {
            low = high
            break
        }
        if (midEvent.originServerTs < event.originServerTs) {
            low = mid + 1
        } else if (midEvent.originServerTs > event.originServerTs) {
            high = mid
        } else {
            if (midEvent.eventId < event.eventId) {
                low = mid + 1
            } else {
                high = mid
            }
        }
    }
    if (timeline[low]?.eventId === event.eventId) return true
    timeline.splice(low, 0, event)
    return false
}

function getTimelineEventIndexById(
    timeline: ApiV3SyncClientEventWithoutRoomId[],
    eventId?: string,
    limit: number = Infinity,
    start?: number,
): number | undefined {
    if (eventId == null) return
    const lowerLimit = Math.max(0, timeline.length - 1 - limit)
    const upperLimit = start != null ? Math.min(timeline.length - 1, start) : timeline.length - 1
    for (let eventIndex = upperLimit; eventIndex >= lowerLimit; eventIndex--)  {
        if (timeline[eventIndex]?.eventId === eventId) {
            return eventIndex
        }
    }
}

function getTimelineEventById(
    timeline: ApiV3SyncClientEventWithoutRoomId[],
    eventId?: string,
    limit: number = Infinity,
    start?: number,
): ApiV3SyncClientEventWithoutRoomId | undefined {
    return timeline[getTimelineEventIndexById(timeline, eventId, limit, start) ?? -1]
}

function getTimelineEventIndexByTransactionId(
    timeline: ApiV3SyncClientEventWithoutRoomId[],
    txnId?: string,
    limit: number = Infinity,
): number | undefined {
    if (txnId == null) return
    const lowerLimit = Math.max(0, timeline.length - 1 - limit)
    for (let eventIndex = timeline.length - 1; eventIndex >= lowerLimit; eventIndex--)  {
        if (timeline[eventIndex]?.txnId === txnId) {
            return eventIndex
        }
    }
}

function manageTimelineGap(room: JoinedRoom | LeftRoom, timeline: ApiV3SyncTimeline, nextBatch: string) {
    if (timeline.limited && room.timelineGapStartToken && room.timelineGapEndToken) {
        /* 
         * We already have a gap that has not been filled, don't want to maintain multiple gaps. Discard old events.
         *
         *      |---timeline1---|               |----timeline2----|
         *   endToken      gapEndtoken    gapStartToken       startToken
         *
         *                                      |----timeline2----|              |-------timeline3-------|
         *                                   endToken         gapEndtoken    gapStartToken           startToken
         */
        const visibleGapEndEventIndex = getTimelineEventIndexById(room.visibleTimeline, room.timelineGapNewestVisibleEventId)
        const invisibleGapEndEventIndex = getTimelineEventIndexById(room.invisibleTimeline, room.timelineGapNewestInvisibleEventId)
        if (visibleGapEndEventIndex != null || invisibleGapEndEventIndex != null) {
            room.visibleTimeline = visibleGapEndEventIndex != null ? room.visibleTimeline.slice(visibleGapEndEventIndex + 1) : room.visibleTimeline
            room.invisibleTimeline = invisibleGapEndEventIndex != null ? room.invisibleTimeline.slice(invisibleGapEndEventIndex + 1) : room.invisibleTimeline
            room.timelineEndToken = room.timelineGapStartToken
            room.timelineGapEndToken = room.timelineStartToken
            room.timelineGapStartToken = timeline.prevBatch
            room.timelineStartToken = nextBatch
        } else {
            // If we can't find where to slice the timeline, do a total reset.
            room.visibleTimeline = []
            room.invisibleTimeline = []
            room.timelineGapStartToken = undefined
            room.timelineGapEndToken = undefined
            room.timelineEndToken = timeline.prevBatch
            room.timelineStartToken = nextBatch
        }
        room.timelineGapNewestVisibleEventId = room.visibleTimeline[room.visibleTimeline.length - 1]?.eventId
        room.timelineGapNewestInvisibleEventId = room.invisibleTimeline[room.invisibleTimeline.length - 1]?.eventId
        room.nonSequentialUpdateUuid = uuidv4()
    } else if (timeline.limited && room.timelineEndToken) {
        /* 
         * We have a normal timeline, but a gap is being created. Future API calls will fill in the gap.
         * 
         *      |---timeline1---|
         *   endToken       startToken
         * 
         *      |---timeline1---|             |---timeline2---|
         *   endToken      gapEndToken   gapStartToken    startToken
         */
        room.timelineGapEndToken = room.timelineStartToken
        room.timelineGapStartToken = timeline.prevBatch
        room.timelineStartToken = nextBatch
        room.timelineGapNewestVisibleEventId = room.visibleTimeline[room.visibleTimeline.length - 1]?.eventId
        room.timelineGapNewestInvisibleEventId = room.invisibleTimeline[room.invisibleTimeline.length - 1]?.eventId
        room.nonSequentialUpdateUuid = uuidv4()
    } else {
        /*
         * No gap and not creating a gap. Only take prevBatch token if we don't already have an older one.
         *
         *       |---timeline1---| 
         *    endToken       startToken
         * 
         *       |---timeline1---|---timeline2---|
         *    endToken                       startToken
         */
        if (!room.timelineEndToken) {
            room.timelineEndToken = timeline.prevBatch
        }
        room.timelineStartToken = nextBatch
    }
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
    const route = useRoute()
    const { isLeader } = useBroadcast()
    const { hiddenRooms } = storeToRefs(useAccountDataStore())
    const { userId: sessionUserId } = storeToRefs(useSessionStore())

    const roomsLoading = ref<boolean>(true)
    const roomsLoadError = ref<Error | null>(null)

    const invited = ref<Record<string, InvitedRoom>>({})
    const knocked = ref<Record<string, KnockedRoom>>({})
    const joined = ref<Record<string, JoinedRoom>>({})
    const left = ref<Record<string, LeftRoom>>({})
    const decryptedRoomEvents = ref<Record<string, ApiV3SyncClientEventWithoutRoomId>>({})

    async function initialize() {
        try {
            invited.value = {}
            knocked.value = {}
            joined.value = {}
            left.value = {}
            const tableKeys: [[string, string]] = await getAllDiscortixTableKeys('rooms')
            const loadPromises: Promise<void>[] = []
            for (const [membershipType, roomId] of tableKeys) {
                loadPromises.push(
                    loadDiscortixTableKey('rooms', [membershipType, roomId]).then((room) => {
                        if (membershipType === 'invited') {
                            invited.value[roomId] = room
                        } else if (membershipType === 'knocked') {
                            knocked.value[roomId] = room
                        } else if (membershipType === 'joined') {
                            joined.value[roomId] = room
                        } else if (membershipType === 'left') {
                            left.value[roomId] = room
                        }
                    })
                )
            }
            await Promise.allSettled(loadPromises)

            // Mark recent unsent messages as errored.
            const checkLimit = Math.max(Math.round(1000 / Object.keys(joined.value).length), 20)
            for (const roomId in joined.value) {
                const joinedRoom = joined.value[roomId]!
                const lowerLimit = Math.max(0, joinedRoom.visibleTimeline.length - checkLimit)
                for (let i = joinedRoom.visibleTimeline.length - 1; i >= lowerLimit; i--) {
                    const event = joinedRoom.visibleTimeline[i]
                    if (!event?.txnId) continue
                    event.sendError = true
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                roomsLoadError.value = error
            } else {
                roomsLoadError.value = new Error('The thrown object was not an error.')
            }
        }
        roomsLoading.value = false
    }
    initialize()

    async function populateFromApiV3SyncResponse(sync: ApiV3SyncResponse) {
        if (!sync.rooms) return

        let updatedInvitedRoomIds: Set<string> = new Set()
        let deletedInvitedRoomIds: Set<string> = new Set()
        let updatedKnockedRoomIds: Set<string> = new Set()
        let deletedKnockedRoomIds: Set<string> = new Set()
        let updatedJoinedRoomIds: Set<string> = new Set()
        let deletedJoinedRoomIds: Set<string> = new Set()
        let updatedLeftRoomIds: Set<string> = new Set()
        let deletedLeftRoomIds: Set<string> = new Set()

        // Populate invited room state
        if (sync.rooms.invite) {
            for (const roomId in sync.rooms.invite) {
                const invitedRoomsSync = sync.rooms.invite[roomId]
                if (!invitedRoomsSync) continue

                if (!invited.value[roomId]) {
                    invited.value[roomId] = {
                        roomId,
                        stateEventsByType: {},
                        receivedTs: Date.now(),
                    }
                }

                updatedInvitedRoomIds.add(roomId)

                if (knocked.value[roomId]) {
                    delete knocked.value[roomId]
                    deletedKnockedRoomIds.add(roomId)
                }
                if (joined.value[roomId]) {
                    delete joined.value[roomId]
                    deletedJoinedRoomIds.add(roomId)
                }
                if (left.value[roomId]) {
                    delete left.value[roomId]
                    deletedLeftRoomIds.add(roomId)
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
            for (const roomId in sync.rooms.knock) {
                const knockedRoomsSync = sync.rooms.knock[roomId]
                if (!knockedRoomsSync) continue

                if (!knocked.value[roomId]) {
                    knocked.value[roomId] = {
                        roomId,
                        stateEventsByType: {},
                    }
                }

                updatedKnockedRoomIds.add(roomId)

                if (invited.value[roomId]) {
                    delete invited.value[roomId]
                    deletedInvitedRoomIds.add(roomId)
                }
                if (joined.value[roomId]) {
                    delete joined.value[roomId]
                    deletedJoinedRoomIds.add(roomId)
                }
                if (left.value[roomId]) {
                    delete left.value[roomId]
                    deletedLeftRoomIds.add(roomId)
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
            for (const roomId in sync.rooms.join) {
                const joinedRoomSync = sync.rooms.join[roomId]
                if (!joinedRoomSync) continue

                if (!joined.value[roomId]) {
                    joined.value[roomId] = {
                        roomId,
                        accountData: left.value[roomId]?.accountData ?? {},
                        nonSequentialUpdateUuid: '',
                        reactions: {},
                        readRecepts: {},
                        redactions: [],
                        replacements: {},
                        stateEventsByType: {},
                        stateEventsById: {},
                        summary: {},
                        visibleTimeline: [],
                        invisibleTimeline: [],
                        typingUserIds: [],
                        unreadNotifications: { highlightCount: 0, notificationCount: 0 },
                        unreadThreadNotifications: {},
                    }
                }

                updatedJoinedRoomIds.add(roomId)

                if (invited.value[roomId]) {
                    delete invited.value[roomId]
                    deletedInvitedRoomIds.add(roomId)
                }
                if (knocked.value[roomId]) {
                    delete knocked.value[roomId]
                    deletedKnockedRoomIds.add(roomId)
                }
                if (left.value[roomId]) {
                    delete left.value[roomId]
                    deletedLeftRoomIds.add(roomId)
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
                if (joinedRoomSync.timeline) {
                    manageTimelineGap(joined.value[roomId], joinedRoomSync.timeline, sync.nextBatch)
                    if (joinedRoomSync.timeline.events) {
                        for (const timelineEvent of joinedRoomSync.timeline.events) {
                            if (isRoomStateEventType(timelineEvent.type)) {
                                addJoinedOrLeftRoomStateEvent(joined.value[roomId], timelineEvent)
                            }
                            addJoinedOrLeftRoomTimelineEvent(joined.value[roomId], timelineEvent)
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
            const leftRooms: Record<string, ApiV3SyncLeftRoom> = sync.rooms.leave ?? {}
            for (const roomId in leftRooms) {
                const leftRoomSync = leftRooms[roomId]
                if (!leftRoomSync) continue

                if (!left.value[roomId]) {
                    left.value[roomId] = {
                        roomId,
                        accountData: joined.value[roomId]?.accountData ?? {},
                        nonSequentialUpdateUuid: '',
                        reactions: {},
                        redactions: [],
                        replacements: {},
                        stateEventsByType: {},
                        stateEventsById: {},
                        visibleTimeline: [],
                        invisibleTimeline: [],
                    }
                }

                updatedLeftRoomIds.add(roomId)

                if (invited.value[roomId]) {
                    delete invited.value[roomId]
                    deletedInvitedRoomIds.add(roomId)
                }
                if (knocked.value[roomId]) {
                    delete knocked.value[roomId]
                    deletedKnockedRoomIds.add(roomId)
                }
                if (joined.value[roomId]) {
                    delete joined.value[roomId]
                    deletedJoinedRoomIds.add(roomId)
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
                if (leftRoomSync.timeline) {
                    manageTimelineGap(left.value[roomId], leftRoomSync.timeline, sync.nextBatch)
                    if (leftRoomSync.timeline.events) {
                        for (const timelineEvent of leftRoomSync.timeline.events) {
                            if (isRoomStateEventType(timelineEvent.type)) {
                                addJoinedOrLeftRoomStateEvent(left.value[roomId], timelineEvent)
                            }
                            addJoinedOrLeftRoomTimelineEvent(left.value[roomId], timelineEvent)
                        }
                    }
                }
            }
        }

        if (isLeader.value) {
            const deletePromises: Promise<void>[] = []
            for (const roomId of deletedInvitedRoomIds) {
                deletePromises.push(
                    deleteDiscortixTableKey('rooms', ['invited', roomId])
                )
            }
            for (const roomId of deletedKnockedRoomIds) {
                deletePromises.push(
                    deleteDiscortixTableKey('rooms', ['knocked', roomId])
                )
            }
            for (const roomId of deletedJoinedRoomIds) {
                deletePromises.push(
                    deleteDiscortixTableKey('rooms', ['joined', roomId])
                )
            }
            for (const roomId of deletedLeftRoomIds) {
                deletePromises.push(
                    deleteDiscortixTableKey('rooms', ['left', roomId])
                )
            }
            await Promise.allSettled(deletePromises)

            const updatePromises: Promise<void>[] = []
            for (const roomId of updatedInvitedRoomIds) {
                updatePromises.push(
                    saveDiscortixTableKey('rooms', ['invited', roomId], toRaw(invited.value[roomId])).catch(() => {
                        localStorage.setItem('mx_full_sync_required', 'true')
                    })
                )
            }
            for (const roomId of updatedKnockedRoomIds) {
                updatePromises.push(
                    saveDiscortixTableKey('rooms', ['knocked', roomId], toRaw(knocked.value[roomId])).catch((error) => {
                        localStorage.setItem('mx_full_sync_required', 'true')
                    })
                )
            }
            for (const roomId of updatedJoinedRoomIds) {
                updatePromises.push(
                    saveDiscortixTableKey('rooms', ['joined', roomId], toRaw(joined.value[roomId])).catch(() => {
                        localStorage.setItem('mx_full_sync_required', 'true')
                    })
                )
            }
            for (const roomId of updatedLeftRoomIds) {
                updatePromises.push(
                    saveDiscortixTableKey('rooms', ['left', roomId], toRaw(left.value[roomId])).catch((error) => {
                        localStorage.setItem('mx_full_sync_required', 'true')
                    })
                )
            }
            await Promise.allSettled(updatePromises)
        }

    }

    async function populateSentMessageEvent(roomId: string, event: ApiV3SyncClientEventWithoutRoomId) {
        const room = joined.value[roomId]
        if (!room) return
        addJoinedOrLeftRoomTimelineEvent(room, event)

        updateJoinedRoomDatabase(roomId)
    }

    async function associateTransactionIdWithEventId(roomId: string, txnId: string, eventId: string) {
        const room = joined.value[roomId]
        if (!room) return
        const eventIndex = getTimelineEventIndexById(room.visibleTimeline, eventId)
        const transactionEventIndex = getTimelineEventIndexByTransactionId(room.visibleTimeline, txnId, 100)
        if (eventIndex != null && transactionEventIndex != null) {
            if (eventIndex !== transactionEventIndex) {
                room.visibleTimeline.splice(transactionEventIndex, 1)
            } else {
                if (room.visibleTimeline[transactionEventIndex]) {
                    delete room.visibleTimeline[transactionEventIndex].txnId
                }
            }
        } else if (transactionEventIndex != null) {
            if (room.visibleTimeline[transactionEventIndex]) {
                room.visibleTimeline[transactionEventIndex].eventId = eventId
                delete room.visibleTimeline[transactionEventIndex].txnId
            }
        }

        updateJoinedRoomDatabase(roomId)
    }

    async function populateFromApiV3RoomMessagesResponse(roomId: string, messages: ApiV3RoomMessagesResponse) {
        const joinedRoom = joined.value[roomId]
        const leftRoom = left.value[roomId]
        const room = joinedRoom ?? leftRoom
        if (!room) return

        let duplicateEncounteredCount = 0

        for (const timelineEvent of messages.chunk) {
            duplicateEncounteredCount += addJoinedOrLeftRoomTimelineEvent(room, timelineEvent) ? 1 : 0
            if (duplicateEncounteredCount > 3) break
        }

        if (room.timelineGapStartToken && room.timelineGapEndToken) {
            if (messages.end) {
                if (duplicateEncounteredCount > 3) {
                    delete room.timelineGapStartToken
                    delete room.timelineGapEndToken
                    room.timelineEndToken = messages.end
                } else {
                    room.timelineGapStartToken = messages.end
                }
            } else {
                delete room.timelineGapStartToken
                delete room.timelineGapEndToken
            }
        } else {
            room.timelineEndToken = messages.end
        }

        // Different browser tabs can fetch different room histories, and only the leader's history is kept.
        // This means if the leader swaps to a different tab, chat messages from the previous leader can
        // be lost in storage because the new leader doesn't have them. But we're treating message fetching
        // as semi-ephemeral state anyways. They can always be fetched again.
        if (isLeader.value) {
            if (joinedRoom) {
                try {
                    await saveDiscortixTableKey('rooms', ['joined', roomId], toRaw(joined.value[roomId]))
                } catch (error) {
                    // Ignore - It is not critical that message history is updated. Can fetch again.
                }
            } else if (leftRoom) {
                try {
                    await saveDiscortixTableKey('rooms', ['left', roomId], toRaw(left.value[roomId]))
                } catch (error) {
                    // Ignore - It is not critical that message history is updated. Can fetch again.
                }
            }
        }
    }

    async function updateInvitedRoomDatabase(roomId: string) {
        if (isLeader.value) {
            try {
                if (invited.value[roomId]) {
                    await saveDiscortixTableKey('rooms', ['invited', roomId], toRaw(invited.value[roomId]))
                } else {
                    await deleteDiscortixTableKey('rooms', ['invited', roomId])
                }
            } catch (error) {
                // Ignore - It is not critical that message history is updated. Can fetch again.
            }
        }
    }
    async function updateKnockedRoomDatabase(roomId: string) {
        if (isLeader.value) {
            try {
                if (knocked.value[roomId]) {
                    await saveDiscortixTableKey('rooms', ['knocked', roomId], toRaw(knocked.value[roomId]))
                } else {
                    await deleteDiscortixTableKey('rooms', ['knocked', roomId])
                }
            } catch (error) {
                // Ignore - It is not critical that message history is updated. Can fetch again.
            }
        }
    }
    async function updateJoinedRoomDatabase(roomId: string) {
        if (isLeader.value) {
            try {
                if (joined.value[roomId]) {
                    await saveDiscortixTableKey('rooms', ['joined', roomId], toRaw(joined.value[roomId]))
                } else {
                    await deleteDiscortixTableKey('rooms', ['joined', roomId])
                }
            } catch (error) {
                // Ignore - It is not critical that message history is updated. Can fetch again.
            }
        }
    }
    async function updateLeftRoomDatabase(roomId: string) {
        if (isLeader.value) {
            try {
                if (left.value[roomId]) {
                    await saveDiscortixTableKey('rooms', ['left', roomId], toRaw(left.value[roomId]))
                } else {
                    await deleteDiscortixTableKey('rooms', ['left', roomId])
                }
            } catch (error) {
                // Ignore - It is not critical that message history is updated. Can fetch again.
            }
        }
    }
    
    // This includes one-on-one and group chats.
    const allDirectMessageRooms = computed(() => {
        const rooms: RoomSummary[] = []
        let roomLists = [
            ['invited', invited.value] as const,
            ['joined', joined.value] as const,
        ]
        for (const [membershipType, roomList] of roomLists) {
            for (const roomId in roomList) {
                const room = roomList[roomId]
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

                let heroes = new Set<string>(((room as JoinedRoom)?.summary?.['m.heroes'] ?? []).filter((userId) => userId !== sessionUserId.value))
                let joinedMemberCount = (room as JoinedRoom)?.summary?.['m.joined_member_count']
                if (heroes.size < 5 || !joinedMemberCount) {
                    const memberEvents = roomMemberEvents.filter(
                        (event) => event.stateKey && (event.content.membership === 'join' || event.content.membership === 'invite')
                    )
                    if (heroes.size < 5) {
                        heroes = new Set(memberEvents.filter((event) => event.stateKey !== sessionUserId.value).map((event) => event.stateKey ?? ''))
                    }
                    if (!joinedMemberCount) {
                        joinedMemberCount = memberEvents.filter(
                            (event) => event.content.membership === 'join'
                        ).length
                    }
                }

                rooms.push({
                    membershipType,
                    avatarUrl: roomAvatarEvent?.content?.info?.thumbnailUrl ?? roomAvatarEvent?.content?.url,
                    creator: (
                        parseInt(roomVersion) >= 11
                            ? roomCreateEvent.sender
                            : roomCreateEvent.content.creator
                    ) ?? '',
                    heroes: Array.from(heroes),
                    roomId,
                    joinedMemberCount,
                    name: (roomNameEvent?.content.name ?? '').trim(),
                    roomVersion,
                    lastMessageTs: (room as InvitedRoom)?.receivedTs ?? (room as JoinedRoom).visibleTimeline?.[(room as JoinedRoom).visibleTimeline?.length - 1]?.originServerTs ?? 0,
                    tags: (room as JoinedRoom).accountData?.['m.tag']?.tags,
                })
            }
        }
        rooms.sort((a, b) => a.lastMessageTs > b.lastMessageTs ? -1 : 1)
        return rooms
    })

    const invitedDirectMessageRooms = computed(() => {
        return allDirectMessageRooms.value.filter((room) => room.membershipType === 'invited')
    })

    const joinedDirectMessageRooms = computed(() => {
        return allDirectMessageRooms.value.filter((room) => {
            return (
                room.membershipType === 'joined'
                && !room.tags?.['m.server_notice']
                && !hiddenRooms.value[room.roomId]
            )
        })
    })

    const serverNoticeRooms = computed(() => {
        return allDirectMessageRooms.value.filter((room) => {
            return room.membershipType === 'joined' && !!room.tags?.['m.server_notice']
        })
    })

    const currentRoomEncryptionEnabledTimestamp = computed(() => {
        const currentRoomId = route.name === 'room' ? `${route.params?.roomId}` : ''
        const roomEncryptionEvent = joined.value[currentRoomId]?.stateEventsByType['m.room.encryption']?.[0]
        return roomEncryptionEvent?.originServerTs
    })

    // event.event.type === 'm.room.encrypted'

    // Permissions in the current chat room for the current user
    const currentRoomPermissions = computed(() => {
        const currentRoomId = route.name === 'room' ? `${route.params?.roomId}` : ''
        const roomCreateEvent = joined.value[currentRoomId]?.stateEventsByType['m.room.create']?.[0]
        const roomVersion = parseInt(roomCreateEvent?.content.roomVersion ?? '1')
        const roomCreators = roomVersion <= 10
            ? [roomCreateEvent?.content?.creator]
            : [roomCreateEvent?.sender, ...(roomVersion >= 12 ? roomCreateEvent?.content.additionalCreators ?? [] : []) ]
        const roomPowerLevels = joined.value[currentRoomId]?.stateEventsByType['m.room.power_levels']?.[0]
        const isRoomCreator = roomCreators.includes(sessionUserId.value)
        const currentUserPowerLevel
            = (isRoomCreator && roomVersion >= 12 ? Infinity : undefined)
            ?? roomPowerLevels?.content.users?.[sessionUserId.value ?? '']
            ?? roomPowerLevels?.content.usersDefault
            ?? (isRoomCreator ? 100 : 0)
        const events = roomPowerLevels?.content?.events
        const eventsDefault = roomPowerLevels?.content?.eventsDefault ?? 0
        const stateDefault = roomPowerLevels?.content?.stateDefault ?? 50
        return {
            ban: currentUserPowerLevel >= (roomPowerLevels?.content.ban ?? 50),
            changeGuestAccess: currentUserPowerLevel >= (events?.['m.room.guest_access'] ?? stateDefault),
            changeHistoryVisibility: currentUserPowerLevel >= (events?.['m.room.history_visibility'] ?? stateDefault),
            changeJoinRules: currentUserPowerLevel >= (events?.['m.room.join_rules'] ?? stateDefault),
            changePowerLevels: currentUserPowerLevel >= (events?.['m.room.power_levels'] ?? stateDefault),
            changePinnedEvents: currentUserPowerLevel >= (events?.['m.room.pinned_events'] ?? stateDefault),
            changeSeverAcl: currentUserPowerLevel >= (events?.['m.room.server_acl'] ?? stateDefault),
            changeRoomAvatar: currentUserPowerLevel >= (events?.['m.room.avatar'] ?? stateDefault),
            changeRoomCanonicalAlias: currentUserPowerLevel >= (events?.['m.room.canonical_alias'] ?? stateDefault),
            changeRoomName: currentUserPowerLevel >= (events?.['m.room.name'] ?? stateDefault),
            changeRoomTopic: currentUserPowerLevel >= (events?.['m.room.topic'] ?? stateDefault),
            closeRoom: currentUserPowerLevel >= (events?.['m.room.tombstone'] ?? stateDefault),
            enableRoomEncryption: currentUserPowerLevel >= (events?.['m.room.encryption'] ?? stateDefault),
            endPoll: currentUserPowerLevel >= (
                events?.['m.poll.end'] ?? events?.['org.matrix.msc3381.poll.end'] ?? eventsDefault
            ),
            invite: currentUserPowerLevel >= (roomPowerLevels?.content.invite ?? 0),
            inviteThirdParty: currentUserPowerLevel >= (events?.['m.room.third_party_invite'] ?? stateDefault),
            kick: currentUserPowerLevel >= (roomPowerLevels?.content.kick ?? 50),
            redactOwnEvent: currentUserPowerLevel >= (events?.['m.room.redaction'] ?? eventsDefault),
            redactOtherUserEvent: currentUserPowerLevel >= (events?.['m.room.redaction'] ?? eventsDefault)
                && currentUserPowerLevel >= (roomPowerLevels?.content?.redact ?? 50),
            sendKeyVerificationAccept: currentUserPowerLevel >= (events?.['m.key.verification.accept'] ?? eventsDefault),
            sendKeyVerificationCancel: currentUserPowerLevel >= (events?.['m.key.verification.cancel'] ?? eventsDefault),
            sendKeyVerificationDone: currentUserPowerLevel >= (events?.['m.key.verification.done'] ?? eventsDefault),
            sendKeyVerificationRequest: currentUserPowerLevel >= (events?.['m.key.verification.request'] ?? eventsDefault),
            sendKeyVerificationStart: currentUserPowerLevel >= (events?.['m.key.verification.start'] ?? eventsDefault),
            sendMessage: currentUserPowerLevel >= (events?.['m.room.message'] ?? eventsDefault),
            sendPollResponse: currentUserPowerLevel >= (
                events?.['m.poll.response'] ?? events?.['org.matrix.msc3381.poll.response'] ?? eventsDefault
            ),
            sendReaction: currentUserPowerLevel >= (events?.['m.reaction'] ?? eventsDefault),
            sendSticker: currentUserPowerLevel >= (events?.['m.sticker'] ?? eventsDefault),
            startPoll: currentUserPowerLevel >= (
                events?.['m.poll.start'] ?? events?.['org.matrix.msc3381.poll.start'] ?? eventsDefault
            ),
        }
    })

    function deleteInvitedRoom(roomId: string) {
        delete invited.value[roomId]
        updateInvitedRoomDatabase(roomId)
    }
    function deleteKnockedRoom(roomId: string) {
        delete knocked.value[roomId]
        updateKnockedRoomDatabase(roomId)
    }
    function deleteJoinedRoom(roomId: string) {
        delete joined.value[roomId]
        updateJoinedRoomDatabase(roomId)
    }
    function deleteLeftRoom(roomId: string) {
        delete left.value[roomId]
        updateLeftRoomDatabase(roomId)
    }

    return {
        roomsLoading,
        roomsLoadError,
        invited: computed(() => invited.value),
        knocked: computed(() => knocked.value),
        joined: computed(() => joined.value),
        left: computed(() => left.value),
        deleteInvitedRoom,
        deleteKnockedRoom,
        deleteJoinedRoom,
        deleteLeftRoom,
        currentRoomEncryptionEnabledTimestamp,
        currentRoomPermissions,
        decryptedRoomEvents,
        invitedDirectMessageRooms,
        joinedDirectMessageRooms,
        serverNoticeRooms,
        getTimelineEventIndexById,
        getTimelineEventById,
        associateTransactionIdWithEventId,
        populateSentMessageEvent,
        populateFromApiV3SyncResponse,
        populateFromApiV3RoomMessagesResponse,
        updateJoinedRoomDatabase,
    }
})