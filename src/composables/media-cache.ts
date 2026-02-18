import { onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session'
import { fetch, HttpError } from '@/utils/fetch'

const mxcObjectUrls = new Map<string, string>()
const mxcObjectUrlUserCount = new Map<string, number>()

interface MxcUrlParts {
    serverName: string | null;
    mediaId: string | null;
}

const mxcUriRegex = /^mxc:\/\/([^\/]+)\/([^\/]+)$/
function parseMxcUri(mxcUri: string): MxcUrlParts {
    if (!mxcUriRegex.test(mxcUri)) return { serverName: null, mediaId: null }
    const slashPosition = mxcUri.indexOf('/', 6)
    return {
        serverName: mxcUri.slice(6, slashPosition),
        mediaId: mxcUri.slice(slashPosition + 1),
    }
}

export interface GetMxcObjectUrlOptions {
    type?: 'thumbnail' | 'download';
    width?: number;
    height?: number;
    method?: 'crop' | 'scale';
    animated?: boolean;
}

export function useMediaCache() {
    const { homeserverBaseUrl } = storeToRefs(useSessionStore())
    const usedMxcUris = new Set<string>()

    /** Fetch media from the server and store the blob as an object URL */
    async function getMxcObjectUrl(
        mxcUri: string,
        options: GetMxcObjectUrlOptions,
        abortController?: AbortController,
    ): Promise<string> {
        if (!options.type) options.type = 'download'
        const optionsId = JSON.stringify(options)
        const mxcStoreId = mxcUri + '::' + optionsId
        let objectUrl = mxcObjectUrls.get(mxcStoreId)
        fetchMedia:
        if (!objectUrl) {
            const { serverName, mediaId } = parseMxcUri(mxcUri)
            if (!serverName || !mediaId) break fetchMedia
            const queryParams: Record<string, any> = { ...options }
            delete queryParams.type
            let response: Response
            if (options.type === 'thumbnail') {
                response = await fetch(
                    `${homeserverBaseUrl.value}/_matrix/client/v1/media/thumbnail/${
                        encodeURIComponent(serverName)
                    }/${
                        encodeURIComponent(mediaId)
                    }?${
                        new URLSearchParams(queryParams)
                    }`, {
                        signal: abortController?.signal,
                        useAuthorization: true,
                    },
                )
            } else { // Full image.
                response = await fetch(
                    `${homeserverBaseUrl.value}/_matrix/client/v1/media/download/${
                        encodeURIComponent(serverName)
                    }/${
                        encodeURIComponent(mediaId)
                    }?${
                        new URLSearchParams(queryParams)
                    }`, {
                        signal: abortController?.signal,
                        useAuthorization: true,
                    },
                )
            }
            if (abortController?.signal?.aborted) break fetchMedia
            if (!response.ok) throw new HttpError(response)
            const blob = await response.blob()
            if (abortController?.signal?.aborted) break fetchMedia
            objectUrl = URL.createObjectURL(blob)
            mxcObjectUrls.set(mxcStoreId, objectUrl)
        }
        if (objectUrl && !usedMxcUris.has(mxcStoreId)) {
            mxcObjectUrlUserCount.set(mxcStoreId, (mxcObjectUrlUserCount.get(mxcStoreId) ?? 0) + 1)
            usedMxcUris.add(mxcStoreId)
        }
        if (!objectUrl) throw new DOMException('Unable to find the media.')
        return objectUrl
    }

    onUnmounted(() => {
        for (const mxcStoreId of usedMxcUris) {
            const userCount = Math.max(0, (mxcObjectUrlUserCount.get(mxcStoreId) ?? 0) - 1)
            mxcObjectUrlUserCount.set(mxcStoreId, userCount)
            if (userCount === 0) {
                const objectUrl = mxcObjectUrls.get(mxcStoreId)
                if (!objectUrl) continue
                URL.revokeObjectURL(objectUrl)
                mxcObjectUrls.delete(mxcStoreId)
                mxcObjectUrlUserCount.delete(mxcStoreId)
            }
        }
    })

    return {
        getMxcObjectUrl,
    }
}
