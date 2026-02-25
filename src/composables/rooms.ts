import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { createLogger } from '@/composables/logger'
import { useRoomStore } from '@/stores/room'
import { useSessionStore } from '@/stores/session'
import { fetchJson } from '@/utils/fetch'

import {
    ApiV3JoinedRoomsResponseSchema, type ApiV3JoinedRoomsResponse,
    type ApiV3RoomMessagesRequest, ApiV3RoomMessagesResponseSchema, type ApiV3RoomMessagesResponse,
} from '@/types'

const log = createLogger(import.meta.url)

const retrievingPreviousMessagePromises = ref<Record<string, Promise<void>>>({})
const messageFetchErrorsByRoomId = ref<Record<string, Error>>({})

export function useRooms() {
    const { homeserverBaseUrl } = storeToRefs(useSessionStore())
    const roomStore = useRoomStore()
    const { joined, left } = storeToRefs(roomStore)
    const { populateFromApiV3RoomMessagesResponse } = roomStore

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
                    delete retrievingPreviousMessagePromises.value[roomId]

                    populateFromApiV3RoomMessagesResponse(roomId, result)

                    from = room.timelineGapStartToken
                }

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

    return {
        messageFetchErrorsByRoomId: computed(() => messageFetchErrorsByRoomId.value),
        getJoinedRooms,
        getPreviousMessages,
    }
}
