import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { createLogger } from '@/composables/logger'
import { fetchJson } from '@/utils/fetch'
import * as z from 'zod'

import { useSessionStore } from '@/stores/session'
import { useSyncStore } from '@/stores/sync'

import {
    ApiV3LoginResponseSchema, type ApiV3LoginResponse,
    type ApiV3LoginRequestPassword
} from '@/types'
import type { ServerDiscovery } from './server-discovery'

const log = createLogger(import.meta.url)

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

    const sessionId = ref<string | undefined>(undefined)

    async function login(formData?: LoginFormData) {
        loading.value = true

        const matrixBaseUrl = serverDiscovery.value.homeserverBaseUrl ?? ''

        try {
            const sessionStore = useSessionStore()
            const { deviceId, homeserverBaseUrl } = storeToRefs(sessionStore)
            const { setFromApiV3LoginResponse: setSessionFromApiV3LoginResponse } = sessionStore

            let loginResponse: ApiV3LoginResponse | undefined = undefined
            // Return from authDone fallback
            if (!formData && sessionId.value) {
                loginResponse = await fetchJson(`${matrixBaseUrl}/_matrix/client/v3/login`, {
                    method: 'POST',
                    body: JSON.stringify({
                        session: sessionId.value,
                    }),
                })
            }
            // Password authentication
            else if (formData?.password) {
                const identifierString = formData.username ?? ''
                let identifier: ApiV3LoginRequestPassword['identifier'] = {
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
                loginResponse = await fetchJson<ApiV3LoginResponse>(
                    `${matrixBaseUrl}/_matrix/client/v3/login`, {
                        method: 'POST',
                        body: JSON.stringify({
                            type: 'm.login.password',
                            identifier,
                            password: formData.password,
                            device_id: deviceId.value,
                            session: sessionId.value,
                        } satisfies ApiV3LoginRequestPassword),
                        jsonSchema: ApiV3LoginResponseSchema,
                    }
                )
            }
            if (loginResponse) {
                const { setNextBatch } = useSyncStore()
                setNextBatch(undefined)
                homeserverBaseUrl.value = matrixBaseUrl
                setSessionFromApiV3LoginResponse(loginResponse)
            }
        } catch (e) {
            log.error(e)
            if (e instanceof Error) {
                error.value = e
            } else {
                error.value = new Error('The thrown object was not an error.')
            }
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

    return { loading, error, sessionId, login }
}
