import { storeToRefs } from 'pinia'

import { fetchJson } from '@/utils/fetch'

import { useSessionStore } from '@/stores/session'

import {
    ApiV3DevicesResponseSchema, type ApiV3DevicesResponse
} from '@/types'

let cachedDevicesResponse: ApiV3DevicesResponse | undefined = undefined
let lastDevicesFetchTs: number = 0

export function useDevices() {
    const { userId: sessionUserId, deviceId: sessionDeviceId, homeserverBaseUrl } = storeToRefs(useSessionStore())
    
    async function getCurrentUserDevices() {
        if (Date.now() - lastDevicesFetchTs < 300000 && cachedDevicesResponse) return cachedDevicesResponse

        const response = await fetchJson<ApiV3DevicesResponse>(
            `${homeserverBaseUrl.value}/_matrix/client/v3/devices`,
            {
                method: 'GET',
                useAuthorization: true,
                jsonSchema: ApiV3DevicesResponseSchema,
            },
        )
        cachedDevicesResponse = response
        lastDevicesFetchTs = Date.now()

        return response
    }

    return {
        getCurrentUserDevices,
    }
}
