import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { fetchJson } from '@/utils/fetch'
import * as z from 'zod'

import { useSessionStore } from '@/stores/session'

import {
    ApiLegacyLoginResponseSchema, type ApiLegacyLoginResponse,
    type ApiLoginRequestPassword
} from '@/types'
import type { ServerDiscovery } from './server-discovery'

export interface LoginFormData {
    username?: string;
    password?: string;
}

export function useLogin(options: {
    serverDiscovery: Ref<ServerDiscovery>
}) {
    const { serverDiscovery } = options

    const loading = ref(false)

    const error = ref<Error | null>(null)

    const session = ref<string | undefined>(undefined)

    async function login(formData?: LoginFormData) {
        loading.value = true

        const matrixBaseUrl = serverDiscovery.value.baseUrl ?? ''

        try {
            const { accessToken, deviceId, refreshToken, userId } = storeToRefs(useSessionStore())

            // Return from authDone fallback
            if (!formData && session.value) {
                await fetchJson(`${matrixBaseUrl}/_matrix/client/v3/login`, {
                    method: 'POST',
                    body: JSON.stringify({
                        session: session.value,
                    }),
                })
            } else if (formData?.password) {
                const identifierString = formData.username ?? ''
                let identifier: ApiLoginRequestPassword['identifier'] = {
                    type: 'm.id.user',
                    user: identifierString,
                }
                if (z.email().safeParse(identifierString).success) {
                    identifier = {
                        type: 'm.id.thirdparty',
                        medium: 'email',
                        address: identifierString,
                    }
                } else if (z.e164().safeParse(identifierString).success) {
                    const { PhoneNumberUtil } = await import('google-libphonenumber')
                    const phoneUtil = PhoneNumberUtil.getInstance()
                    identifier = {
                        type: 'm.id.phone',
                        country: phoneUtil.getRegionCodeForNumber(
                            phoneUtil.parse(identifierString)
                        ) ?? '',
                        phone: identifierString,
                    }
                }
                const loginResponse = await fetchJson<ApiLegacyLoginResponse>(
                    `${matrixBaseUrl}/_matrix/client/v3/login`, {
                        method: 'POST',
                        body: JSON.stringify({
                            type: 'm.login.password',
                            identifier,
                            password: formData.password,
                            device_id: deviceId.value,
                            session: session.value,
                        } satisfies ApiLoginRequestPassword),
                        jsonSchema: ApiLegacyLoginResponseSchema,
                    }
                )

                accessToken.value = loginResponse.accessToken
                deviceId.value = loginResponse.deviceId
                refreshToken.value = loginResponse.refreshToken
                userId.value = loginResponse.userId
            }

            await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (e) {
            console.error(e)
            error.value = e as Error
        } finally {
            loading.value = false
        }
    }

    function onPostMessage(event: MessageEvent) {
        if (event.data === 'authDone') {
            login()
        }
    }

    onMounted(() => {
        window.addEventListener('message', onPostMessage)
    })

    onUnmounted(() => {
        window.removeEventListener('message', onPostMessage)
    })

    return { loading, error, session, login }
}
