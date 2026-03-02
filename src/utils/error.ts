export { ZodError } from 'zod'

export class EncryptionNotSupportedError extends Error {
    constructor(message?: string) {
        const defaultMessage = 'Encryption is not supported.'
        super(message ?? defaultMessage)
        this.name = 'EncryptionNotSupportedError'
    }
}

export class EncryptionVerificationError extends Error {
    constructor(message?: string) {
        const defaultMessage = 'Encryption key verification failed.'
        super(message ?? defaultMessage)
        this.name = 'EncryptionVerificationError'
    }
}

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
            (this.status === 404 || this.status === 400)
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

export class InvalidFileError extends Error {
    constructor(message?: string) {
        const defaultMessage = 'The contents of the file are in an invalid format.'
        super(message ?? defaultMessage)
        this.name = 'InvalidFileError'
    }
}

export class MissingSessionDataError extends Error {
    constructor(message?: string) {
        const defaultMessage = 'Session data is missing.'
        super(message ?? defaultMessage)
        this.name = 'MissingSessionDataError'
    }
}

export class NetworkConnectionError extends Error {
    constructor(message?: string) {
        const defaultMessage = 'An error occurred when connecting to the network host.'
        super(message ?? defaultMessage)
        this.name = 'NetworkConnectionError'
    }
}