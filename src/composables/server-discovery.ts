import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import { fetchJson, HttpError } from '@/utils/fetch'
import * as z from 'zod'

import {
    ClientConfigSchema, type ClientConfig,
    SupportConfigSchema, type SupportConfig,
    ApiLoginFlowsSchema, type ApiLoginFlows,
    ApiVersionsConfigSchema, type ApiVersionsConfig,
    type ApiRegisterRequest,
    ApiRegisterFlowsSchema, type ApiRegisterFlows,
} from '@/types'

export interface ServerDiscovery {
    homeserverBaseUrl?: string;
    client?: ClientConfig;
    support?: SupportConfig;
    versions?: string[];
    unstableFeatures?: Record<string, boolean>;
    loginFlows?: ApiLoginFlows['flows'];
    registerFlows?: {
        guest?: ApiRegisterFlows;
        user?: ApiRegisterFlows;
        error?: Error;
    }
}


export function useServerDiscovery(scenario: 'login' | 'register') {
    const { t } = useI18n()
    const { buildConfig } = useConfigStore()
    const defaultHomeserverUrl = buildConfig.defaultServerConfig['m.homeserver'].baseUrl;

    const loading = ref(false)

    const error = ref<Error | null>(null)

    const errorMessage = computed(() => {
        if (error.value instanceof SyntaxError || error.value instanceof z.ZodError) {
            return t('errors.discoverHomeserver.schemaValidation')
        } else if (error.value instanceof HttpError) {
            return t('errors.discoverHomeserver.httpError')
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
        wellKnownAbortController = new AbortController()
        loadAbortController?.abort()
        loadAbortController = new AbortController()
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

        console.log(serverTopDomain);

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

        serverDiscovery.value.client = undefined
        if (serverBaseUrl !== defaultHomeserverUrl) {
            try {
                const clientConfig = await fetchJson<ClientConfig>(
                    `${serverTopDomain}/.well-known/matrix/client`,
                    { jsonSchema: ClientConfigSchema, signal: loadAbortController.signal },
                )
                serverDiscovery.value.client = clientConfig
                serverBaseUrl = clientConfig['m.homeserver'].baseUrl
                serverDiscovery.value.homeserverBaseUrl = serverBaseUrl
            } catch (error) {
                serverDiscovery.value.homeserverBaseUrl = undefined
                throw error
            }
        }

        try {
            const versions = await fetchJson<ApiVersionsConfig>(
                `${serverBaseUrl}/_matrix/client/versions`,
                { jsonSchema: ApiVersionsConfigSchema, signal: loadAbortController.signal },
            )
            serverDiscovery.value.versions = versions.versions
            serverDiscovery.value.unstableFeatures = versions.unstableFeatures

            if (scenario === 'login') {
                const loginFlows = await fetchJson<ApiLoginFlows>(
                    `${serverBaseUrl}/_matrix/client/v3/login`,
                    { jsonSchema: ApiLoginFlowsSchema, signal: loadAbortController.signal },
                )
                serverDiscovery.value.loginFlows = loginFlows.flows
            } else if (scenario === 'register') {
                const registerFlows: ServerDiscovery['registerFlows'] = {}
                await Promise.all([
                    // Set up a session for guest registration
                    fetchJson<ApiRegisterRequest>(
                        `${serverBaseUrl}/_matrix/client/v3/register?kind=guest`,
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                initial_device_display_name: `${window.location.host}: ${window.navigator.userAgent}`,
                            }),
                            jsonSchema: {
                                401: ApiRegisterFlowsSchema,
                            }
                        },
                    ).catch((error) => {
                        if (error instanceof HttpError) {
                            if (error.status === 401) {
                                if ((error.responseBody as ApiRegisterFlows)?.flows) {
                                    registerFlows.guest = error.responseBody
                                }
                            } else if (!registerFlows.error) {
                                registerFlows.error = error
                            }
                        }
                    }),
                    // Set up a session for user registration
                    fetchJson<ApiRegisterRequest>(
                        `${serverBaseUrl}/_matrix/client/v3/register?kind=user`,
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                initial_device_display_name: `${window.location.host}: ${window.navigator.userAgent}`,
                            }),
                            jsonSchema: {
                                401: ApiRegisterFlowsSchema,
                            }
                        },
                    ).catch((error) => {
                        if (error instanceof HttpError) {
                            if (error.status === 401) {
                                if ((error.responseBody as ApiRegisterFlows)?.flows) {
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
