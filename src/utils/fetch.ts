import { type ZodType } from 'zod'

export class HttpError extends Error {
    readonly response: Response
    readonly responseBody: any
    readonly status: number

    constructor(response: Response, responseBody?: any, message?: string) {
        const defaultMessage = `HTTP error ${response.status} – ${response.statusText}`
        super(message ?? defaultMessage)
        this.name = 'HttpError'
        this.response = response
        this.responseBody = responseBody
        this.status = response.status
    }

    isMatrixGuestAccessForbidden() {
        return (
            this.status === 403
            && this.responseBody?.errcode === 'M_GUEST_ACCESS_FORBIDDEN'
        )
    }

    isMatrixForbidden() {
        return (
            this.status === 403
            && this.responseBody?.errcode === 'M_FORBIDDEN'
        )
    }

    isMatrixNotFound() {
        return (
            this.status === 404
            && this.responseBody?.errcode === 'M_NOT_FOUND'
        )
    }

    isMatrixRateLimited() {
        return (
            this.status === 429
            && this.responseBody?.errcode === 'M_LIMIT_EXCEEDED'
        )
    }

    isMatrixUserDeactivated() {
        return (
            this.status === 403
            && this.responseBody?.errcode === 'M_USER_DEACTIVATED'
        )
    }
}

interface EnhancedRequestInit extends RequestInit {
}

export async function fetch(input: RequestInfo | URL, init?: EnhancedRequestInit) {
    let response = await window.fetch(input, init)
    if (response.status === 429) {
        try {
            const responseBody = await response.json()
            if (responseBody.errcode === 'M_LIMIT_EXCEEDED') {
                await new Promise((resolve) => setTimeout(
                    resolve,
                    responseBody.retry_after_ms ? responseBody.retry_after_ms + 5 : 1000
                ))
                response = await window.fetch(input, init)
            }
        } catch (error) {
            throw error
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