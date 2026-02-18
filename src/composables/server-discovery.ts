import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchJson, HttpError } from '@/utils/fetch'
import * as z from 'zod'

import {
    ClientConfigSchema, type ClientConfig,
    SupportConfigSchema, type SupportConfig,
    ApiV3LoginFlowsSchema, type ApiV3LoginFlows,
    ApiVersionsConfigSchema, type ApiVersionsConfig,
    type ApiV3RegisterRequest,
    ApiV3RegisterResponseSchema, type ApiV3RegisterResponse,
    ApiV3RegisterFlowsSchema, type ApiV3RegisterFlows,
} from '@/types'

export interface ServerDiscovery {
    homeserverBaseUrl?: string;
    client?: ClientConfig;
    support?: SupportConfig;
    versions?: string[];
    unstableFeatures?: Record<string, boolean>;
    loginFlows?: ApiV3LoginFlows['flows'];
    registerFlows?: {
        guest?: ApiV3RegisterFlows;
        user?: ApiV3RegisterFlows;
        error?: Error;
    },
    guestRegisterResponse?: ApiV3RegisterResponse;
}

export function useServerDiscovery(scenario: 'login' | 'register') {
    const { t } = useI18n()

    const loading = ref(false)

    const error = ref<Error | null>(null)

    const errorMessage = computed(() => {
        if (error.value instanceof SyntaxError || error.value instanceof z.ZodError) {
            return t('errors.discoverHomeserver.schemaValidation')
        } else if (error.value instanceof HttpError) {
            return t('errors.discoverHomeserver.httpError')
        } else if (error.value instanceof TypeError) {
            return t('errors.discoverHomeserver.serverDown')
        } else if (error.value instanceof DOMException && error.value.name === 'AbortError') {
            return undefined
        }
        return t('errors.unexpected')
    })

    const serverDiscovery = ref<ServerDiscovery>({})

    let wellKnownAbortController: AbortController | undefined
    let loadAbortController: AbortController | undefined

    function reset() {
        loading.value = false
        error.value = null
        serverDiscovery.value = {}
        wellKnownAbortController?.abort()
        loadAbortController?.abort()
    }

    function override(newServerDiscovery: ServerDiscovery) {
        reset()
        serverDiscovery.value = newServerDiscovery
    }

    async function load(serverBaseUrl: string) {
        serverBaseUrl = serverBaseUrl.replace(/\/$/g, '')
        serverDiscovery.value.homeserverBaseUrl = serverBaseUrl

        const serverTopDomain = (serverBaseUrl.includes('http://') ? 'http://' : 'https://')
            + serverBaseUrl.split('.').slice(-2).join('.')

        wellKnownAbortController?.abort()
        wellKnownAbortController = new AbortController()
        loadAbortController?.abort()
        loadAbortController = new AbortController()

        loading.value = true
        error.value = null

        fetchJson<SupportConfig>(
            `${serverTopDomain}/.well-known/matrix/support`,
            { jsonSchema: SupportConfigSchema, signal: wellKnownAbortController.signal },
        ).then((supportConfig) => {
            serverDiscovery.value.support = supportConfig
        }).catch(() => {
            serverDiscovery.value.support = undefined
        }).finally(() => {
            wellKnownAbortController = undefined
        })

        try {
            serverDiscovery.value.client = undefined
            if (!/^https?\:\/\//.test(serverBaseUrl)) {
                try {
                    const clientConfig = await fetchJson<ClientConfig>(
                        `${serverTopDomain}/.well-known/matrix/client`,
                        { jsonSchema: ClientConfigSchema, signal: loadAbortController.signal },
                    )
                    serverDiscovery.value.client = clientConfig
                    serverBaseUrl = clientConfig['m.homeserver'].baseUrl
                } catch (error) {
                    serverBaseUrl = 'https://' + serverBaseUrl
                } finally {
                    serverDiscovery.value.homeserverBaseUrl = serverBaseUrl
                }
            }

            if (!serverDiscovery.value.client) {
                serverDiscovery.value.client = {
                    'm.homeserver': {
                        baseUrl: serverBaseUrl,
                    },
                }
            }

            if (loadAbortController.signal.aborted) throw new DOMException('Server discovery aborted', 'AbortError')
            const versions = await fetchJson<ApiVersionsConfig>(
                `${serverBaseUrl}/_matrix/client/versions`,
                { jsonSchema: ApiVersionsConfigSchema, signal: loadAbortController.signal },
            )
            serverDiscovery.value.versions = versions.versions
            serverDiscovery.value.unstableFeatures = versions.unstableFeatures

            if (loadAbortController.signal.aborted) throw new DOMException('Server discovery aborted', 'AbortError')
            if (scenario === 'login') {
                const loginFlows = await fetchJson<ApiV3LoginFlows>(
                    `${serverBaseUrl}/_matrix/client/v3/login`,
                    { jsonSchema: ApiV3LoginFlowsSchema, signal: loadAbortController.signal },
                )
                serverDiscovery.value.loginFlows = loginFlows.flows
            } else if (scenario === 'register') {
                serverDiscovery.value.guestRegisterResponse = undefined
                const registerFlows: ServerDiscovery['registerFlows'] = {}
                await Promise.all([
                    // Set up a session for guest registration
                    fetchJson<ApiV3RegisterResponse>(
                        `${serverBaseUrl}/_matrix/client/v3/register?kind=guest`,
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                initial_device_display_name: `${window.location.host}: ${window.navigator.userAgent}`,
                            } satisfies ApiV3RegisterRequest),
                            signal: loadAbortController.signal,
                            jsonSchema: {
                                200: ApiV3RegisterResponseSchema,
                                401: ApiV3RegisterFlowsSchema,
                            }
                        },
                    ).then((response) => {
                        serverDiscovery.value.guestRegisterResponse = response
                    }).catch((error) => {
                        if (error instanceof HttpError) {
                            if (error.status === 401) {
                                if ((error.responseBody as ApiV3RegisterFlows)?.flows) {
                                    registerFlows.guest = error.responseBody
                                }
                            } else if (!registerFlows.error) {
                                registerFlows.error = error
                            }
                        }
                    }),
                    // Set up a session for user registration
                    fetchJson<ApiV3RegisterResponse>(
                        `${serverBaseUrl}/_matrix/client/v3/register?kind=user`,
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                initial_device_display_name: `${window.location.host}: ${window.navigator.userAgent}`,
                            } satisfies ApiV3RegisterRequest),
                            signal: loadAbortController.signal,
                            jsonSchema: {
                                401: ApiV3RegisterFlowsSchema,
                            }
                        },
                    ).catch((error) => {
                        if (error instanceof HttpError) {
                            if (error.status === 401) {
                                if ((error.responseBody as ApiV3RegisterFlows)?.flows) {
                                    registerFlows.user = error.responseBody
                                }
                            } else {
                                registerFlows.error = error
                            }
                        }
                    }),
                ])
                serverDiscovery.value.registerFlows = registerFlows
            }
        } catch (e) {
            error.value = e as Error
        } finally {
            loadAbortController = undefined
            loading.value = false
        }
    }

    onUnmounted(() => {
        wellKnownAbortController?.abort()
        wellKnownAbortController = new AbortController()
        loadAbortController?.abort()
        loadAbortController = new AbortController()
    })

    return {
        serverDiscovery: computed(() => serverDiscovery.value),
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        errorMessage,
        reset,
        override,
        load,
    }
}
