import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session'
import { fetchJson } from '@/utils/fetch'

import { ApiV3JoinedRoomsResponseSchema, type ApiV3JoinedRoomsResponse } from '@/types'

export function useRooms() {
    const { homeserverBaseUrl } = storeToRefs(useSessionStore())

    async function getJoinedRooms() {
        return fetchJson<ApiV3JoinedRoomsResponse>(
            `${homeserverBaseUrl.value}/_matrix/client/v3/joined_rooms`,
            {
                useAuthorization: true,
                jsonSchema: ApiV3JoinedRoomsResponseSchema,
            },
        )
    }

    return { getJoinedRooms }
}
