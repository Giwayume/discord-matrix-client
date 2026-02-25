import { computed, ref, toRaw, watch } from 'vue'
import { defineStore, storeToRefs } from 'pinia'

import { onLogout } from '@/composables/logout'
import { useCryptoKeysStore } from '@/stores/crypto-keys'
import { getPickleKey } from '@/utils/pickle-key'
import { decryptSecret, pickleKeyToAesKey } from '@/utils/secret-storage'
import {
    loadTableKey as loadMatrixReactSdkTableKey,
    saveTableKey as saveMatrixReactSdkTableKey,
    deleteTableKey as deleteMatrixReactSdkTableKey,
} from './database/matrix-react-sdk'

import type { AesHmacSha2EncryptedData, ApiV3LoginResponse } from '@/types'

export const useSessionStore = defineStore('session', () => {
    const secureSessionInitialized = ref<boolean>(false)

    /* User ID */
    const userId = ref<string | undefined>(localStorage.getItem('mx_user_id') ?? undefined)
    watch(() => userId.value, (userId) => {
        if (userId != null) {
            localStorage.setItem('mx_user_id', userId)
        } else {
            localStorage.removeItem('mx_user_id')
        }
    })

    /* Device ID */
    const deviceId = ref<string | undefined>(localStorage.getItem('mx_device_id') ?? undefined)
    watch(() => deviceId.value, (deviceId) => {
        if (deviceId != null) {
            localStorage.setItem('mx_device_id', deviceId)
        } else {
            localStorage.removeItem('mx_device_id')
        }
    })

    /* Decrypted Access Token - @/composables/crypto-keys.ts::initialize() decrypts. */
    const decryptedAccessToken = ref<string | undefined>()

    /* Access Token */
    const accessToken = ref<string | AesHmacSha2EncryptedData | undefined>(localStorage.getItem('mx_access_token') ?? undefined)
    const accessTokenLoading = ref<boolean>(true)
    const accessTokenError = ref<Error | null>(null)
    try {
        if (accessToken.value) {
            decryptedAccessToken.value = accessToken.value as string
            accessTokenLoading.value = false
        } else {
            loadMatrixReactSdkTableKey('account', 'mx_access_token').then((value) => {
                if (accessTokenLoading.value) {
                    accessToken.value = value
                }
            }).catch((error) => {
                if (error instanceof Error) {
                    accessTokenError.value = error
                } else {
                    accessTokenError.value = new Error('The thrown object was not an error.')
                }
            }).finally(() => {
                accessTokenLoading.value = false
            })
        }
    } catch (error) {
        if (error instanceof Error) {
            accessTokenError.value = error
        } else {
            accessTokenError.value = new Error('The thrown object was not an error.')
        }
        accessTokenLoading.value = false
    }
    watch(() => accessToken.value, async (accessToken) => {
        accessTokenLoading.value = false
        try {
            if (accessToken) {
                if (Object.prototype.toString.call(accessToken) === '[object Object]') {
                    localStorage.removeItem('mx_access_token')
                    await saveMatrixReactSdkTableKey('account', 'mx_access_token', toRaw(accessToken))
                } else {
                    localStorage.setItem('mx_access_token',
                        Object.prototype.toString.call(accessToken) === '[object String]'
                            ? accessToken as string
                            : JSON.stringify(accessToken as string)
                    )
                }
            } else {
                localStorage.removeItem('mx_access_token')
                await deleteMatrixReactSdkTableKey('account', 'mx_access_token')
            }
        } catch (error) {
            console.error(error)
            localStorage.removeItem('mx_access_token')
        }
    })

    /* Decrypted Refresh Token - @/composables/crypto-keys.ts::initialize() decrypts. */
    const decryptedRefreshToken = ref<string | undefined>()

    /* Refresh Token */
    const refreshToken = ref<string | AesHmacSha2EncryptedData | undefined>(localStorage.getItem('mx_refresh_token') ?? undefined)
    const refreshTokenLoading = ref<boolean>(true)
    const refreshTokenError = ref<Error | null>(null)
    try {
        if (refreshToken.value) {
            decryptedRefreshToken.value = refreshToken.value as string
            refreshTokenLoading.value = false
        } else {
            loadMatrixReactSdkTableKey('account', 'mx_refresh_token').then((value) => {
                if (refreshTokenLoading.value) {
                    refreshToken.value = value
                }
            }).catch((error) => {
                if (error instanceof Error) {
                    refreshTokenError.value = error
                } else {
                    refreshTokenError.value = new Error('The thrown object was not an error.')
                }
            }).finally(() => {
                refreshTokenLoading.value = false
            })
        }
    } catch (error) {
        if (error instanceof Error) {
            refreshTokenError.value = error
        } else {
            refreshTokenError.value = new Error('The thrown object was not an error.')
        }
        refreshTokenLoading.value = false
    }
    watch(() => refreshToken.value, async (refreshToken) => {
        refreshTokenLoading.value = false
        try {
            if (refreshToken) {
                if (Object.prototype.toString.call(refreshToken) === '[object Object]') {
                    localStorage.removeItem('mx_refresh_token')
                    await saveMatrixReactSdkTableKey('account', 'mx_refresh_token', toRaw(refreshToken))
                } else {
                    localStorage.setItem('mx_refresh_token',
                        Object.prototype.toString.call(refreshToken) === '[object String]'
                            ? refreshToken as string
                            : JSON.stringify(refreshToken as string)
                    )
                }
            } else {
                await deleteMatrixReactSdkTableKey('account', 'mx_refresh_token')
            }
        } catch (error) {
            localStorage.removeItem('mx_refresh_token')
        }
    })

    /* Homeserver URL */
    const homeserverBaseUrl = ref<string | undefined>(localStorage.getItem('mx_hs_url') ?? undefined)
    watch(() => homeserverBaseUrl.value, (homeserverBaseUrl) => {
        if (homeserverBaseUrl != null) {
            localStorage.setItem('mx_hs_url', homeserverBaseUrl)
        } else {
            localStorage.removeItem('mx_hs_url')
        }
    })
    
    /* Is a guest session */
    const isGuest = ref<boolean>(localStorage.getItem('mx_is_guest') == 'true')
    watch(() => isGuest.value, (isGuest) => {
        localStorage.setItem('mx_is_guest', `${isGuest}`)
    })

    /* Check if anything is loading from storage */
    const loading = computed(() => {
        return accessTokenLoading.value || refreshTokenLoading.value
    })

    const hasAuthenticatedSession = computed(() => {
        return !!(accessToken.value || refreshToken.value)
    })

    /** Convert Legacy Login API Response to Session */
    function setFromApiV3LoginResponse(loginResponse: ApiV3LoginResponse) {
        accessToken.value = loginResponse.accessToken
        deviceId.value = loginResponse.deviceId
        refreshToken.value = loginResponse.refreshToken
        userId.value = loginResponse.userId
    }

    /** Clear all state and navigate to the login page. */
    onLogout(() => {
        secureSessionInitialized.value = false
        accessToken.value = undefined
        refreshToken.value = undefined
        userId.value = undefined
        isGuest.value = false
    })

    return {
        accessToken,
        accessTokenLoading,
        accessTokenError,
        decryptedAccessToken,
        decryptedRefreshToken,
        deviceId,
        hasAuthenticatedSession,
        homeserverBaseUrl,
        isGuest,
        loading,
        refreshToken,
        refreshTokenLoading,
        refreshTokenError,
        secureSessionInitialized,
        setFromApiV3LoginResponse,
        userId,
    }
})
