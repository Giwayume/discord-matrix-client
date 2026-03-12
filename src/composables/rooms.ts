import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

import { useBroadcast } from '@/composables/broadcast'
import { createLogger } from '@/composables/logger'

import { useClientSettingsStore } from '@/stores/client-settings'
import { useRoomStore } from '@/stores/room'
import { useSpaceStore } from '@/stores/space'
import { useSessionStore } from '@/stores/session'

import { fetchJson } from '@/utils/fetch'
import { camelizeSchema, snakeCaseApiRequest } from '@/utils/zod'

import {
    type ApiV1RoomHierarchyRequest, ApiV1RoomHierarchyResponseSchema, type ApiV1RoomHierarchyResponse,
    ApiV3JoinedRoomsResponseSchema, type ApiV3JoinedRoomsResponse,
    type ApiV3RoomMessagesRequest, ApiV3RoomMessagesResponseSchema, type ApiV3RoomMessagesResponse,
    type ApiV3RoomTypingRequest,
    ApiV3RoomSendMessageEventResponseSchema, type ApiV3RoomSendMessageEventResponse,
    type ApiV3SyncClientEventWithoutRoomId, ApiV3SyncClientEventWithoutRoomIdSchema,
    type ApiV3RoomRedactMessageRequest, ApiV3RoomRedactMessageResponseSchema
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
    const { settings } = useClientSettingsStore()
    const { homeserverBaseUrl, userId } = storeToRefs(useSessionStore())
    const roomStore = useRoomStore()
    const { joined, left } = storeToRefs(roomStore)
    const { getTimelineEventIndexById, populateFromApiV3RoomMessagesResponse, updateJoinedRoomDatabase } = roomStore
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
                        `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${roomId}/messages?`
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
                        `${homeserverBaseUrl.value}/_matrix/client/v1/rooms/${roomId}/hierarchy?`
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

    async function sendTypingNotification(roomId: string, typing: boolean) {
        if (!settings.sendTypingIndicators) return
        await fetchJson(
            `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${roomId}/typing/${userId.value}`,
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
            `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${roomId}/event/${eventId}`,
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
            `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${roomId}/send/${eventType}/${txnId}`,
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
            updateJoinedRoomDatabase()
            return true
        }
        return false
    }

    async function redactEvent(roomId: string, eventId: string, reason?: string) {
        if (redactUnsentEvent(roomId, eventId, true)) return

        await fetchJson(
            `${homeserverBaseUrl.value}/_matrix/client/v3/rooms/${roomId}/redact/${eventId}/${uuidv4()}`,
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
        sendTypingNotification,
        getMessageEvent,
        sendMessageEvent,
        redactEvent,
    }
}
