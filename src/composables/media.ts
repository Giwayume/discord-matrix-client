import { storeToRefs } from 'pinia'

import { fetchJson, HttpError } from '@/utils/fetch'

import { useSessionStore } from '@/stores/session'

import {
    type ApiV3MediaCreateResponse, ApiV3MediaCreateResponseSchema,
    type ApiV3MediaUploadResponse, ApiV3MediaUploadResponseSchema,
    type MediaInfo,
} from '@/types'

// If relevant APIs fail, this gets set to false
let isMsc2246Supported = true

const audioMediaTypes = [
    'audio/aac', 'audio/flac', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
]
const imageMediaTypes = [
    'image/apng', 'image/bmp', 'image/gif', 'image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp',
]
const videoMediaTypes = [
    'video/mp4', 'video/ogg', 'video/quicktime', 'video/webm', 'video/x-matroska',
]

export async function createMediaInfo(objectUrlOrBlob: string | Blob): Promise<MediaInfo> {
    let objectUrl = (typeof objectUrlOrBlob === 'string') ? objectUrlOrBlob : undefined
    let blob: Blob | null
    try {
        blob = (typeof objectUrlOrBlob === 'string')
            ? await (await fetch(objectUrlOrBlob)).blob()
            : objectUrlOrBlob
    } catch (error) {
        return { type: 'unknown' }
    }
    if (!blob) return { type: 'unknown' }

    let shouldRevokeObjectUrl = false
    if (imageMediaTypes.includes(blob.type)) {
        try {
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image()
                const onLoad = () => {
                    image.removeEventListener('load', onLoad)
                    image.removeEventListener('error', onError)
                    resolve(image)
                }
                const onError = () => {
                    image.removeEventListener('load', onLoad)
                    image.removeEventListener('error', onError)
                    reject()
                }
                image.addEventListener('load', onLoad)
                image.addEventListener('error', onError)
                if (!objectUrl) {
                    objectUrl = URL.createObjectURL(blob)
                    shouldRevokeObjectUrl = true
                }
                image.src = objectUrl
            })
            if (shouldRevokeObjectUrl) {
                URL.revokeObjectURL(objectUrl!)
            }
            return {
                type: 'image',
                info: {
                    h: image.height,
                    mimetype: blob.type,
                    size: blob.size,
                    w: image.width,
                }
            }
        } catch (error) {
            if (shouldRevokeObjectUrl) {
                URL.revokeObjectURL(objectUrl!)
            }
            return {
                type: 'image',
                info: {
                    mimetype: blob.type,
                    size: blob.size,
                }
            }
        }
    } else if (videoMediaTypes.includes(blob.type)) {
        try {
            const video = await new Promise<HTMLVideoElement>((resolve, reject) => {
                const video = document.createElement('video')
                video.preload = 'metadata'
                const onLoad = () => {
                    video.removeEventListener('loadedmetadata', onLoad)
                    video.removeEventListener('error', onError)
                    resolve(video)
                }
                const onError = () => {
                    video.removeEventListener('loadedmetadata', onLoad)
                    video.removeEventListener('error', onError)
                    reject()
                }
                video.addEventListener('loadedmetadata', onLoad)
                video.addEventListener('error', onError)
                if (!objectUrl) {
                    objectUrl = URL.createObjectURL(blob)
                    shouldRevokeObjectUrl = true
                }
                video.src = objectUrl
            });
            if (shouldRevokeObjectUrl) {
                URL.revokeObjectURL(objectUrl!)
            }
            return {
                type: 'video',
                info: {
                    duration: video.duration,
                    h: video.videoHeight,
                    mimetype: blob.type,
                    size: blob.size,
                    w: video.videoWidth,
                },
            }
        } catch (error) {
            if (shouldRevokeObjectUrl) {
                URL.revokeObjectURL(objectUrl!)
            }
            return {
                type: 'video',
                info: {
                    mimetype: blob.type,
                    size: blob.size,
                }
            }
        }
    } else if (audioMediaTypes.includes(blob.type)) {
        try {
            const audio = await new Promise<HTMLAudioElement>((resolve, reject) => {
                const audio = document.createElement('audio')
                audio.preload = 'metadata'
                const onLoad = () => {
                    audio.removeEventListener('loadedmetadata', onLoad)
                    audio.removeEventListener('error', onError)
                    resolve(audio)
                }
                const onError = () => {
                    audio.removeEventListener('loadedmetadata', onLoad)
                    audio.removeEventListener('error', onError)
                    reject()
                }
                audio.addEventListener('loadedmetadata', onLoad)
                audio.addEventListener('error', onError)
                if (!objectUrl) {
                    objectUrl = URL.createObjectURL(blob)
                    shouldRevokeObjectUrl = true
                }
                audio.src = objectUrl
            })
            if (shouldRevokeObjectUrl) {
                URL.revokeObjectURL(objectUrl!)
            }
            return {
                type: 'audio',
                info: {
                    duration: audio.duration,
                    mimetype: blob.type,
                    size: blob.size,
                }
            }
        } catch (error) {
            if (shouldRevokeObjectUrl) {
                URL.revokeObjectURL(objectUrl!)
            }
            return {
                type: 'audio',
                info: {
                    mimetype: blob.type,
                    size: blob.size,
                }
            }
        }
    }
    return { type: 'unknown' }
}

export function createLazyMediaUpload() {
    const { homeserverBaseUrl } = storeToRefs(useSessionStore())

    let contentUri: string | undefined = undefined
    let unusedExpiresAt: number | undefined = undefined
    let isUploaded: boolean = false

    let queuedBlob: Blob | null = null

    async function useObjectUrl(objectUrl: string): Promise<string> {
        const blob = await (await fetch(objectUrl)).blob()
        return useBlob(blob)
    }

    async function useBlob(blob: Blob): Promise<string> {
        if (isMsc2246Supported) {
            try {
                ({ contentUri, unusedExpiresAt } = await fetchJson<ApiV3MediaCreateResponse>(
                    `${homeserverBaseUrl.value}/_matrix/media/v1/create`,
                    {
                        method: 'POST',
                        useAuthorization: true,
                        jsonSchema: ApiV3MediaCreateResponseSchema,
                    }
                ))
                queuedBlob = blob
            } catch (error) {
                if (error instanceof HttpError) {
                    if (error.isMatrixUnrecognized()) {
                        isMsc2246Supported = false
                    } else if (!error.isMatrixRateLimited()) {
                        throw error
                    }
                } else {
                    throw error
                }
            }
        }

        if (!contentUri) {
            // Can't create any more temporary IDs, so upload immediately.
            ({ contentUri } = await fetchJson<ApiV3MediaUploadResponse>(
                `${homeserverBaseUrl.value}/_matrix/media/v1/upload`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': blob.type,
                    },
                    body: blob,
                    useAuthorization: true,
                    jsonSchema: ApiV3MediaUploadResponseSchema,
                }
            ))
            isUploaded = true
        }

        return contentUri
    }

    /** @returns A new contentUri is only returned if it changed from the initial request */
    async function upload(): Promise<string | undefined> {
        if (isUploaded || !queuedBlob) return

        if ((Date.now() > (unusedExpiresAt ?? Infinity)) || !contentUri) {
            ({ contentUri } = await fetchJson<ApiV3MediaUploadResponse>(
                `${homeserverBaseUrl.value}/_matrix/media/v1/upload`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': queuedBlob.type,
                    },
                    body: queuedBlob,
                    useAuthorization: true,
                    jsonSchema: ApiV3MediaUploadResponseSchema,
                }
            ))
            isUploaded = true
            return contentUri
        } else if (contentUri) {
            const [serverName, mediaId] = contentUri.replace(/^mxc\:\/\//, '').split('/')
            await fetchJson(
                `${homeserverBaseUrl.value}/_matrix/media/v3/upload/${serverName}/${mediaId}.`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': queuedBlob.type,
                    },
                    body: queuedBlob,
                    useAuthorization: true,
                }
            )
            isUploaded = true
        }
    }

    return {
        useObjectUrl,
        useBlob,
        upload,
    }

}
