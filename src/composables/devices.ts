import { storeToRefs } from 'pinia'

import { fetchJson } from '@/utils/fetch'

import { useSessionStore } from '@/stores/session'

import {
    ApiV3DevicesResponseSchema, type ApiV3DevicesResponse,
    ApiV3DeleteDeviceAuthenticationResponseSchema, type ApiV3DeleteDeviceRequest,
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

    async function deleteDevice(deviceId: string, auth?: ApiV3DeleteDeviceRequest['auth']) {

        const requestBody: ApiV3DeleteDeviceRequest = {}
        if (auth) {
            requestBody.auth = auth
        }

        return await fetchJson<ApiV3DevicesResponse>(
            `${homeserverBaseUrl.value}/_matrix/client/v3/devices/${deviceId}`,
            {
                method: 'DELETE',
                useAuthorization: true,
                body: JSON.stringify(requestBody),
                skipErrorChecks: [401],
                jsonSchema: {
                    401: ApiV3DeleteDeviceAuthenticationResponseSchema,
                }
            },
        )
    }

    return {
        getCurrentUserDevices,
        deleteDevice,
    }
}
