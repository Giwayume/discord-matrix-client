import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

import { useAccountData } from './account-data'
import { useBroadcast } from '@/composables/broadcast'
import { createLogger } from '@/composables/logger'
import { useServerCapabilities } from '@/composables/server-capabilities'

import { useAccountDataStore } from '@/stores/account-data'
import { useClientSettingsStore } from '@/stores/client-settings'
import { useRoomStore } from '@/stores/room'
import { useSpaceStore } from '@/stores/space'
import { useSessionStore } from '@/stores/session'

import { PendingNetworkRequestError } from '@/utils/error'
import { fetchJson } from '@/utils/fetch'
import { camelizeSchema, snakeCaseApiRequest } from '@/utils/zod'

import {
    type ApiV1RoomHierarchyRequest, ApiV1RoomHierarchyResponseSchema, type ApiV1RoomHierarchyResponse,
    ApiV3JoinedRoomsResponseSchema, type ApiV3JoinedRoomsResponse,
    type ApiV3RoomMessagesRequest, ApiV3RoomMessagesResponseSchema, type ApiV3RoomMessagesResponse,
    type ApiV3RoomTypingRequest,
    ApiV3RoomSendMessageEventResponseSchema, type ApiV3RoomSendMessageEventResponse,
    type ApiV3SyncClientEventWithoutRoomId, ApiV3SyncClientEventWithoutRoomIdSchema,
    type ApiV3RoomRedactMessageRequest, ApiV3RoomRedactMessageResponseSchema,
    type ApiV3RoomJoinRequest, type ApiV3RoomJoinResponse, ApiV3RoomJoinResponseSchema,
    type ApiV3RoomLeaveRequest,
    type EventReactionContent,
    type ApiV3RoomCreateRequest, ApiV3RoomCreateResponseSchema, type ApiV3RoomCreateResponse,
    ApiV3CapabilitiesResponseSchema, type ApiV3CapabilitiesResponse,
} from '@/types'

const log = createLogger(import.meta.url)

const retrievingPreviousMessagePromises = ref<Record<string, Promise<void>>>({})
const messageFetchErrorsByRoomId = ref<Record<string, Error>>({})

const retrievingRoomHierarchyPromises = ref<Record<string, Promise<void>>>({})
const hierarchyFetchErrorsByRoomId = ref<Record<string, Error>>({})
const hierarchyFetchTimestamps = ref<Record<string, number>>({})
const hierarcyFetchFrequency = 1.8e+6 // 30 minutes

export function useRooms() {
    const { onTabMessage, broadcastMessageFromTab } = useBroadcast()
    const { toggleRoomVisibility } = useAccountData()
    const { getCapabilities } = useServerCapabilities()

    const { settings } = useClientSettingsStore()
    const { hiddenRooms } = storeToRefs(useAccountDataStore())
    const { homeserverBaseUrl, userId: sessionUserId } = storeToRefs(useSessionStore())
    const roomStore = useRoomStore()
    const { joined, left } = storeToRefs(roomStore)
    const {
        getTimelineEventIndexById, populateFromApiV3RoomMessagesResponse, updateJoinedRoomDatabase,
        deleteInvitedRoom, deleteKnockedRoom, deleteJoinedRoom, deleteLeftRoom,
    } = roomStore
    const spaceStore = useSpaceStore()
    const { spaceRoomSummaries, spaceLoadingRoomSummaries } = storeToRefs(spaceStore)
    const { populateFromApiV1RoomHierarchyResponse } = spaceStore

    async function getJoinedRooms() {
        return fetchJson<ApiV3JoinedRoomsResponse>(
            `${homeserverBaseUrl.value}/_matrix/client/v3/joined_rooms`,
            {
                useAuthorization: true,
                jsonSchema: ApiV3JoinedRoomsResponseSchema,
            },
        )
    }

    async function getPreviousMessages(roomId: string) {
        const room = joined.value[roomId] ?? left.value[roomId]
        if (!room) return
        if (retrievingPreviousMessagePromises.value[roomId]) {
            return retrievingPreviousMessagePromises.value[roomId]
        }
        delete messageFetchErrorsByRoomId.value[roomId]
        let fetchPromise = new Promise<void>(async (resolve, reject) => {
            try {
                let from = room.timelineGapStartToken ?? room.timelineEndToken

                while (from) {
                    const request: ApiV3RoomMessagesRequest = {
                        dir: 'b',
                        from,
                        to: room.timelineGapEndToken ?? '',
                    }
                    const result = await fetchJson<ApiV3RoomMessagesResponse>(
                        `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?`
                        + new URLSearchParams(request as never),
                        {
                            useAuthorization: true,
                            jsonSchema: ApiV3RoomMessagesResponseSchema,
                        }
                    )

                    populateFromApiV3RoomMessagesResponse(roomId, result)

                    from = room.timelineGapStartToken
                }
                delete retrievingPreviousMessagePromises.value[roomId]

                resolve()
            } catch (error) {
                delete retrievingPreviousMessagePromises.value[roomId]
                if (error instanceof Error) {
                    messageFetchErrorsByRoomId.value[roomId] = error
                } else {
                    messageFetchErrorsByRoomId.value[roomId] = new Error('The thrown object was not an error.')
                }
                log.error('Error when fetching previous messages for room ' + roomId, error)
                reject(error)
            }
        })
        retrievingPreviousMessagePromises.value[roomId] = fetchPromise
        return fetchPromise
    }

    async function getRoomHierarchy(roomId: string) {
        if (spaceRoomSummaries.value[roomId] && Date.now() - hierarcyFetchFrequency > (hierarchyFetchTimestamps.value[roomId] ?? 0)) {
            return
        }
        if (retrievingRoomHierarchyPromises.value[roomId]) {
            return retrievingRoomHierarchyPromises.value[roomId]
        }
        spaceLoadingRoomSummaries.value[roomId] = true
        delete hierarchyFetchErrorsByRoomId.value[roomId]
        let fetchPromise = new Promise<void>(async (resolve, reject) => {
            try {
                let from: string | undefined = undefined
                const rooms: ApiV1RoomHierarchyResponse['rooms'] = []

                do {
                    const request: ApiV1RoomHierarchyRequest = {
                        from,
                        limit: 40,
                        max_depth: 1,
                        suggested_only: false,
                    }
                    const result = await fetchJson<ApiV1RoomHierarchyResponse>(
                        `${homeserverBaseUrl.value}/_matrix/client/v1/rooms/${encodeURIComponent(roomId)}/hierarchy?`
                        + new URLSearchParams(request as never),
                        {
                            useAuthorization: true,
                            jsonSchema: ApiV1RoomHierarchyResponseSchema,
                        }
                    )
                    
                    for (const room of result.rooms) {
                        rooms.push(room)
                    }

                    from = result.nextBatch
                } while (from)

                populateFromApiV1RoomHierarchyResponse(roomId, rooms)

                delete retrievingRoomHierarchyPromises.value[roomId]
                hierarchyFetchTimestamps.value[roomId] = Date.now()
                
                resolve()
            } catch (error) {
                delete retrievingRoomHierarchyPromises.value[roomId]
                if (error instanceof Error) {
                    hierarchyFetchErrorsByRoomId.value[roomId] = error
                } else {
                    hierarchyFetchErrorsByRoomId.value[roomId] = new Error('The thrown object was not an error.')
                }
                log.error('Error when fetching space hierarchy for room ' + roomId, error)
                reject(error)
            } finally {
                spaceLoadingRoomSummaries.value[roomId] = false
            }
        })
        retrievingRoomHierarchyPromises.value[roomId] = fetchPromise
        return fetchPromise
    }

    async function createRoom(request: ApiV3RoomCreateRequest) {
        return await fetchJson<ApiV3RoomCreateResponse>(
            `${homeserverBaseUrl.value}/_matrix/client/v3/createRoom`,
            {
                method: 'POST',
                body: JSON.stringify(request),
                useAuthorization: true,
                jsonSchema: ApiV3RoomCreateResponseSchema,
            }
        )
    }

    async function joinRoom(roomId: string, reason?: string) {
        if (hiddenRooms.value[roomId]) {
            toggleRoomVisibility(roomId, true)
        }
        const request: ApiV3RoomJoinRequest = {}
        if (reason) {
            request.reason = reason
        }
        const response = await fetchJson<ApiV3RoomJoinResponse>(
            `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join`,
            {
                method: 'POST',
                body: JSON.stringify(request),
                useAuthorization: true,
                jsonSchema: ApiV3RoomJoinResponseSchema,
            }
        )
        deleteInvitedRoom(roomId)
        return response
    }

    async function leaveRoom(roomId: string, reason?: string) {
        const request: ApiV3RoomLeaveRequest = {}
        if (reason) {
            request.reason = reason
        }
        const response = await fetchJson(
            `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/leave`,
            {
                method: 'POST',
                body: JSON.stringify(request),
                useAuthorization: true,
            }
        )
        deleteJoinedRoom(roomId)
        return response
    }

    async function forgetRoom(roomId: string) {
        const response = await fetchJson(
            `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/forget`,
            {
                method: 'POST',
                body: '{}',
                useAuthorization: true,
            }
        )
        deleteInvitedRoom(roomId)
        deleteKnockedRoom(roomId)
        deleteJoinedRoom(roomId)
        deleteLeftRoom(roomId)
        return response
    }

    async function sendTypingNotification(roomId: string, typing: boolean) {
        if (!settings.sendTypingIndicators) return
        await fetchJson(
            `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/typing/${sessionUserId.value}`,
            {
                method: 'PUT',
                useAuthorization: true,
                body: JSON.stringify({
                    timeout: typing ? 20000 : undefined,
                    typing,
                } satisfies ApiV3RoomTypingRequest),
            }
        )
    }

    async function getMessageEvent(roomId: string, eventId: string): Promise<ApiV3SyncClientEventWithoutRoomId> {
        return await fetchJson(
            `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/event/${encodeURIComponent(eventId)}`,
            {
                method: 'GET',
                useAuthorization: true,
                jsonSchema: camelizeSchema(ApiV3SyncClientEventWithoutRoomIdSchema),
            }
        )
    }

    async function sendMessageEvent<E = any>(
        roomId: string,
        eventType: string,
        txnId: string,
        eventContent: E
    ): Promise<ApiV3RoomSendMessageEventResponse> {
        return await fetchJson(
            `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/${eventType}/${txnId}`,
            {
                method: 'PUT',
                useAuthorization: true,
                body: JSON.stringify(
                    snakeCaseApiRequest(eventContent)
                ),
                jsonSchema: ApiV3RoomSendMessageEventResponseSchema,
            }
        )
    }

    function removeOwnLocalMessageReaction(
        roomId: string,
        key: string,
        relatedEventId: string,
    ) {
        const room = joined.value[roomId]
        if (!room || !sessionUserId.value) return
        let existingReactionIndex = room.reactions[relatedEventId]
            ?.findIndex((reaction) => reaction.key === key) ?? -1
        const existingReactionShortEventIndex = room.reactions[relatedEventId]?.[existingReactionIndex]?.events
            .findIndex((event) => event.sender === sessionUserId.value) ?? -1
        const existingReactionShortEvent = room.reactions[relatedEventId]?.[existingReactionIndex]?.events[existingReactionShortEventIndex]
        if (!existingReactionShortEvent) return
        room.reactions[relatedEventId]![existingReactionIndex]!.events.splice(existingReactionShortEventIndex, 1)
        if (room.reactions[relatedEventId]![existingReactionIndex]!.events.length === 0) {
            room.reactions[relatedEventId]!.splice(existingReactionIndex, 1)
        }
        if (room.reactions[relatedEventId]!.length === 0) {
            delete room.reactions[relatedEventId]
        }
    }

    async function sendMessageReaction(
        roomId: string,
        key: string,
        relatedEventId: string,
    ) {
        const room = joined.value[roomId]
        if (!room || !sessionUserId.value) return
        let existingReactionIndex = room.reactions[relatedEventId]
            ?.findIndex((reaction) => reaction.key === key) ?? -1
        const existingReactionShortEventIndex = room.reactions[relatedEventId]?.[existingReactionIndex]?.events
            .findIndex((event) => event.sender === sessionUserId.value) ?? -1
        const existingReactionShortEvent = room.reactions[relatedEventId]?.[existingReactionIndex]?.events[existingReactionShortEventIndex]
        if (existingReactionShortEvent?.txnId) {
            throw new PendingNetworkRequestError()
        }
        if (existingReactionShortEvent?.eventId) {
            removeOwnLocalMessageReaction(roomId, key, relatedEventId)
            room.nonSequentialUpdateUuid = uuidv4()
            await redactEvent(roomId, existingReactionShortEvent.eventId)
        } else {
            const txnId = uuidv4()
            if (!room.reactions[relatedEventId]) {
                room.reactions[relatedEventId] = []
            }
            if (existingReactionIndex === -1) {
                room.reactions[relatedEventId].push({
                    key,
                    ts: Date.now(),
                    events: [],
                })
                existingReactionIndex = room.reactions[relatedEventId].length - 1
            }
            room.reactions[relatedEventId][existingReactionIndex]!.events.push({
                sender: sessionUserId.value,
                txnId,
            })
            room.nonSequentialUpdateUuid = uuidv4()
            const eventContent: EventReactionContent = {
                'm.relates_to': {
                    eventId: relatedEventId,
                    key,
                    relType: 'm.annotation',
                }
            }
            try {
                await sendMessageEvent<EventReactionContent>(roomId, 'm.reaction', txnId, eventContent)
            } catch (error) {
                removeOwnLocalMessageReaction(roomId, key, relatedEventId)
                throw error
            }
        }
    }

    function redactUnsentEvent(roomId: string, eventId: string, isBroadcasterTab: boolean): boolean {
        if (!joined.value[roomId]) return false
        let timeline = joined.value[roomId].visibleTimeline
        const eventIndex = getTimelineEventIndexById(timeline, eventId)
        let event: ApiV3SyncClientEventWithoutRoomId | undefined
        if (eventIndex != null) {
            event = timeline[eventIndex]
        } else {
            timeline = joined.value[roomId].invisibleTimeline
            const eventIndex = getTimelineEventIndexById(timeline, eventId)
            event = timeline[eventIndex ?? -1]
        }
        if (event?.txnId && eventIndex != null) {
            timeline.splice(eventIndex, 1)
            joined.value[roomId].nonSequentialUpdateUuid = uuidv4()
            if (isBroadcasterTab) {
                broadcastMessageFromTab({
                    type: 'redactUnsentRoomTimelineEvent',
                    data: {
                        roomId,
                        eventId,
                    },
                })
            }
            updateJoinedRoomDatabase(roomId)
            return true
        }
        return false
    }

    async function redactEvent(roomId: string, eventId: string, reason?: string) {
        if (redactUnsentEvent(roomId, eventId, true)) return

        await fetchJson(
            `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/redact/${encodeURIComponent(eventId)}/${uuidv4()}`,
            {
                method: 'PUT',
                useAuthorization: true,
                body: JSON.stringify({
                    reason,
                } satisfies ApiV3RoomRedactMessageRequest),
                jsonSchema: ApiV3RoomRedactMessageResponseSchema,
            }
        )
        
    }

    onTabMessage((message) => {
        if (message.type === 'redactUnsentRoomTimelineEvent') {
            redactUnsentEvent(message.data.roomId, message.data.eventId, false)
        }
    })

    return {
        messageFetchErrorsByRoomId: computed(() => messageFetchErrorsByRoomId.value),
        getJoinedRooms,
        getPreviousMessages,
        getRoomHierarchy,
        createRoom,
        joinRoom,
        leaveRoom,
        forgetRoom,
        sendTypingNotification,
        getMessageEvent,
        sendMessageEvent,
        sendMessageReaction,
        redactEvent,
    }
}
