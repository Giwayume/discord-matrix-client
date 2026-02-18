import { useLogout } from '@/composables/logout'
import { useSessionStore } from '@/stores/session'
import { type ZodType } from 'zod'

import {
    type ApiV3RefreshLoginRequest,
    ApiV3RefreshLoginResponseSchema,
    type ApiV3RefreshLoginResponse,
} from '@/types'

import { HttpError } from './error'

interface EnhancedRequestInit extends RequestInit {
    headers?: Record<string, string>
    useAuthorization?: boolean;
}

export async function fetch(input: RequestInfo | URL, init?: EnhancedRequestInit) {
    let sessionStore: ReturnType<typeof useSessionStore> | undefined
    if (init?.useAuthorization) {
        sessionStore = useSessionStore()
        if (!init.headers) init.headers = {}
        init.headers['Authorization'] = `Bearer ${sessionStore.decryptedAccessToken}`
    }
    let response = await window.fetch(input, init)

    // Session expired
    if (response.status === 401 && init?.useAuthorization) {
        let responseBody: Record<any, any> | undefined
        try {
            responseBody = await response.json()
        } catch (_) { /* Ignore */ }
        if (responseBody?.errcode === 'M_UNKNOWN_TOKEN') {
            if (responseBody.soft_logout && sessionStore?.decryptedRefreshToken) {
                try {
                    const refreshResponse = await fetchJson<ApiV3RefreshLoginResponse>(
                        `${sessionStore?.homeserverBaseUrl}/_matrix/client/v3/refresh`,
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                refresh_token: sessionStore.decryptedRefreshToken
                            } satisfies ApiV3RefreshLoginRequest),
                            jsonSchema: ApiV3RefreshLoginResponseSchema,
                        },
                    )
                    sessionStore.accessToken = refreshResponse.accessToken
                    if (refreshResponse.refreshToken) {
                        sessionStore.refreshToken = refreshResponse.refreshToken
                    }
                    init.headers!['Authorization'] = `Bearer ${refreshResponse.accessToken}`
                } catch (error) {
                    const { logout } = useLogout()
                    logout()
                    throw error
                }
                response = await window.fetch(input, init)
            } else {
                const { logout } = useLogout()
                logout()
            }
        }
    }

    // Account locked
    if (response.status === 401 && init?.useAuthorization) {
        // This may appear to be duplicate logic from above, but after a token refresh the original API is called again.
        let responseBody: Record<any, any> | undefined
        try {
            responseBody = await response.json()
        } catch (_) { /* Ignore */ }
        if (responseBody?.errcode === 'M_USER_LOCKED' && responseBody.soft_logout) {
            // TODO
        }
    }

    // Rate limited
    if (response.status === 429) {
        let responseBody: Record<any, any> | undefined
        try {
            responseBody = await response.json()
        } catch (_) { /* Ignore */ }
        if (responseBody?.errcode === 'M_LIMIT_EXCEEDED') {
            await new Promise((resolve) => setTimeout(
                resolve,
                responseBody.retry_after_ms ? responseBody.retry_after_ms + 5 : 1000
            ))
            response = await window.fetch(input, init)
        }
    }

    return response
}

interface EnhancedJsonRequestInit extends EnhancedRequestInit {
    jsonSchema?: ZodType | Record<number, ZodType>; // Validates that the response body meets the provided zod schema
    successStatuses?: number[];
}

export async function fetchJson<T = any>(input: RequestInfo | URL, init?: EnhancedJsonRequestInit): Promise<T> {
    const jsonSchema = init?.jsonSchema
    if (jsonSchema) {
        delete init.jsonSchema
    }
    const response = await fetch(input, init)
    if (!response.ok && (!init?.successStatuses || !init.successStatuses.includes(response.status))) {
        let errorResponseBody: any
        try { errorResponseBody = await response.json() } catch (error) {}
        throw new HttpError(response, errorResponseBody)
    }
    let responseBody = await response.json()
    if (jsonSchema) {
        if ((jsonSchema as ZodType).parse) {
            responseBody = (jsonSchema as ZodType).parse(responseBody)
        } else if ((jsonSchema as Record<number, ZodType>)[response.status]) {
            responseBody = (jsonSchema as Record<number, ZodType>)[response.status]?.parse(responseBody)
        }
    }
    return responseBody
}

export { HttpError }
