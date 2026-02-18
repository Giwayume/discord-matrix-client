import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { onLogout } from '@/composables/logout'
import { usePickleKey } from '@/composables/pickle-key'
import { decryptAesHmacSha2EncryptedData } from '@/utils/secret-storage'
import { loadTableKey as loadMatrixReactSdkTableKey, saveTableKey as saveMatrixReactSdkTableKey } from './database/matrix-react-sdk'

import type { AesHmacSha2EncryptedData, ApiV3LoginResponse } from '@/types'

export const useSessionStore = defineStore('session', () => {
    const { get: getPickleKey } = usePickleKey()

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

    /* Retrieve storage encryption key */
    const userDevicePickleKey = ref<string | undefined>()
    watch(() => [userId.value, deviceId.value], () => {
        if (!userId.value) return
        getPickleKey(userId.value, deviceId.value ?? '').then((pickleKey) => {
            userDevicePickleKey.value = pickleKey ?? undefined
        })
    }, { immediate: true })

    /* Access Token */
    const accessToken = ref<string | AesHmacSha2EncryptedData | undefined>(localStorage.getItem('mx_access_token') ?? undefined)
    const accessTokenLoading = ref<boolean>(false)
    const accessTokenError = ref<Error | null>(null)
    try {
        if (accessToken.value) {
            if (accessToken.value.startsWith('{')) {
                accessToken.value = JSON.parse(accessToken.value as string)
            }
        } else {
            accessTokenLoading.value = true
            loadMatrixReactSdkTableKey('account', 'mx_access_token').then((value) => {
                if (accessTokenLoading.value) {
                    accessToken.value = value
                }
            }).catch((error) => {
                accessTokenError.value = error as Error
            }).finally(() => {
                accessTokenLoading.value = false
            })
        }
    } catch (error) {
        accessTokenError.value = error as Error
    }
    watch(() => accessToken.value, async (accessToken) => {
        accessTokenLoading.value = false
        try {
            await saveMatrixReactSdkTableKey('account', 'mx_access_token', accessToken)
        } catch (error) {
            if (accessToken != null) {
                localStorage.setItem('mx_access_token',
                    Object.prototype.toString.call(accessToken) === '[object String]'
                        ? accessToken as string
                        : JSON.stringify(accessToken as string)
                )
            } else {
                localStorage.removeItem('mx_access_token')
            }
        }
    })

    /* Decrypted Access Token */
    const decryptedAccessToken = ref<string | undefined>()
    watch(() => [accessToken.value, userDevicePickleKey.value], async () => {
        if (Object.prototype.toString.call(accessToken.value) === '[object Object]') {
            if (userDevicePickleKey.value) {
                decryptAesHmacSha2EncryptedData(
                    userDevicePickleKey.value,
                    accessToken.value as AesHmacSha2EncryptedData,
                    'access_token'
                ).then((decryptedValue) => {
                    decryptedAccessToken.value = decryptedValue
                })
            }
        } else {
            decryptedAccessToken.value = accessToken.value as string
        }
    }, { immediate: true })

    /* Refresh Token */
    const refreshToken = ref<string | AesHmacSha2EncryptedData | undefined>(localStorage.getItem('mx_refresh_token') ?? undefined)
    const refreshTokenLoading = ref<boolean>(false)
    const refreshTokenError = ref<Error | null>(null)
    try {
        if (refreshToken.value) {
            if (refreshToken.value.startsWith('{')) {
                refreshToken.value = JSON.parse(refreshToken.value as string)
            }
        } else {
            refreshTokenLoading.value = true
            loadMatrixReactSdkTableKey('account', 'mx_refresh_token').then((value) => {
                if (refreshTokenLoading.value) {
                    refreshToken.value = value
                }
            }).catch((error) => {
                refreshTokenError.value = error as Error
            }).finally(() => {
                refreshTokenLoading.value = false
            })
        }
    } catch (error) {
        refreshTokenError.value = error as Error
    }
    watch(() => refreshToken.value, async (refreshToken) => {
        refreshTokenLoading.value = false
        try {
            await saveMatrixReactSdkTableKey('account', 'mx_refresh_token', refreshToken)
        } catch (error) {
            if (refreshToken != null) {
                localStorage.setItem('mx_refresh_token',
                    Object.prototype.toString.call(refreshToken) === '[object String]'
                        ? refreshToken as string
                        : JSON.stringify(refreshToken as string)
                )
            } else {
                localStorage.removeItem('mx_refresh_token')
            }
        }
    })

    /* Decrypted Refresh Token */
    const decryptedRefreshToken = ref<string | undefined>()
    watch(() => [refreshToken.value, userDevicePickleKey.value], async () => {
        if (Object.prototype.toString.call(refreshToken.value) === '[object Object]') {
            if (userDevicePickleKey.value) {
                decryptAesHmacSha2EncryptedData(
                    userDevicePickleKey.value,
                    refreshToken.value as AesHmacSha2EncryptedData,
                    'refresh_token'
                ).then((decryptedValue) => {
                    decryptedRefreshToken.value = decryptedValue
                })
            }
        } else {
            decryptedRefreshToken.value = refreshToken.value as string
        }
    }, { immediate: true })

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
        setFromApiV3LoginResponse,
        userId,
    }
})
