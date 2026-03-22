import { storeToRefs } from 'pinia'
import { type ZodType } from 'zod'
import { camelizeApiResponse, snakeCaseApiRequest } from '@/utils/zod'

import { useAccountDataStore } from '@/stores/account-data'
import { useSessionStore } from '@/stores/session'

import { fetchJson } from '@/utils/fetch'

import {
    eventContentSchemaByType,
    type EventComReeksiteDiscortixHiddenRoomsContent,
} from '@/types'

export function useAccountData() {
    const { homeserverBaseUrl, userId } = storeToRefs(useSessionStore())
    const accountDataStore = useAccountDataStore()
    const { accountData } = storeToRefs(accountDataStore)
    const { populateByType: populateAccountDataByType } = accountDataStore

    async function getAccountDataByType<T = any>(type: string, schema?: ZodType, camelize?: boolean): Promise<T | undefined> {
        try {
            let response = await fetchJson(
                `${homeserverBaseUrl.value}/_matrix/client/v3/user/${encodeURIComponent(userId.value + '')}/account_data/${type}`,
                {
                    useAuthorization: true,
                },
            )
            if (camelize !== false) {
                response = camelizeApiResponse(response)
            }
            const validationSchema = schema ?? eventContentSchemaByType[type as keyof typeof eventContentSchemaByType]
            if (validationSchema && !validationSchema.safeParse(response).success) {
                return undefined
            }
            populateAccountDataByType(type, response)
            return response
        } catch (error) {
            return undefined
        }
    }

    async function setAccountDataByType(type: string, data: any): Promise<void> {
        await fetchJson(
            `${homeserverBaseUrl.value}/_matrix/client/v3/user/${encodeURIComponent(userId.value + '')}/account_data/${type}`,
            {
                method: 'PUT',
                body: JSON.stringify(data),
                useAuthorization: true,
            },
        )
        const camelizedData = camelizeApiResponse(data)
        populateAccountDataByType(type, camelizedData)
    }

    async function toggleRoomVisibility(roomId: string, visible: boolean) {
        const eventContent: EventComReeksiteDiscortixHiddenRoomsContent = accountData.value['com.reeksite.discortix.hidden_rooms'] ?? {}
        if (!eventContent.hiddenRooms) {
            eventContent.hiddenRooms = {}
        }
        if (visible) {
            delete eventContent.hiddenRooms[roomId]
        } else {
            eventContent.hiddenRooms[roomId] = {
                hiddenAt: Date.now(),
            }
        }
        populateAccountDataByType('com.reeksite.discortix.hidden_rooms', eventContent)
        setAccountDataByType('com.reeksite.discortix.hidden_rooms', snakeCaseApiRequest(eventContent))
    }

    return {
        getAccountDataByType,
        setAccountDataByType,
        toggleRoomVisibility,
    }
}