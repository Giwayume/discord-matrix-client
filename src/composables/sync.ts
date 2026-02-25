import { computed, getCurrentInstance, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n, type ComposerTranslation } from 'vue-i18n'
import { useBroadcast } from '@/composables/broadcast'
import { createLogger } from '@/composables/logger'
import { useAccountDataStore } from '@/stores/account-data'
import { useProfileStore } from '@/stores/profile'
import { useSessionStore } from '@/stores/session'
import { useSyncStore } from '@/stores/sync'
import { useRoomStore } from '@/stores/room'
import { fetchJson, HttpError } from '@/utils/fetch'
import { until } from '@/utils/vue'
import * as z from 'zod'

import {
    type ApiV3SyncRequest,
    type ApiV3SyncResponse, ApiV3SyncResponseSchema
} from '@/types/api-events'

const log = createLogger(import.meta.url)

const syncInitialized = ref<boolean>(false)

function getFriendlyErrorMessage(t: ComposerTranslation, error: Error | unknown) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
        return t('errors.sync.schemaValidation')
    } else if (error instanceof HttpError) {
        return t('errors.sync.httpError')
    } else if (error instanceof TypeError) {
        return t('errors.sync.serverDown')
    }
    return t('errors.unexpected')
}

export function useSync() {
    const { t } = useI18n()
    const { isLeader, onFollowerMessage, broadcastMessage } = useBroadcast()
    const accountDataStore = useAccountDataStore()
    const { accountDataLoading, accountDataLoadError } = storeToRefs(accountDataStore)
    const { populateFromApiV3SyncResponse: populateAccountDataFromApiV3SyncResponse } = accountDataStore
    const profileStore = useProfileStore()
    const { profilesLoading, profilesLoadError } = storeToRefs(profileStore)
    const { populateFromApiV3SyncResponse: populateProfilesFromApiV3SyncResponse } = profileStore
    const { homeserverBaseUrl } = storeToRefs(useSessionStore())
    const { getNextBatch, setNextBatch } = useSyncStore()
    const roomStore = useRoomStore()
    const{ roomsLoading, roomsLoadError } = storeToRefs(roomStore)
    const { populateFromApiV3SyncResponse: populateRoomsFromApiV3SyncResponse } = roomStore

    const fullSyncRequired = ref<boolean>(false)

    const syncStatus = ref<'online' | 'offline'>('online')
    watch(() => syncStatus.value, (newSyncStatus, oldSyncStatus) => {
        if (newSyncStatus === 'online' && oldSyncStatus !== 'online') {
            broadcastMessage({ type: 'syncStatus', data: { status: 'online' } })
        } else if (newSyncStatus === 'offline' && oldSyncStatus !== 'offline') {
            broadcastMessage({ type: 'syncStatus', data: { status: 'offline' } })
        }
    })

    function populateAllFromApiSyncResponse(syncResponse: ApiV3SyncResponse) {
        try {
            populateAccountDataFromApiV3SyncResponse(syncResponse)
        } catch (error) {
            log.error('Error when populating account data from sync.', error)
        }
        try {
            populateRoomsFromApiV3SyncResponse(syncResponse)
        } catch (error) {
            log.error('Error when populating rooms from sync.', error)
        }
        try {
            populateProfilesFromApiV3SyncResponse(syncResponse)
        } catch (error) {
            log.error('Error when populating profiles from sync.', error)
        }
    }

    onFollowerMessage((message) => {
        if (message.type === 'apiV3Sync') {
            populateAllFromApiSyncResponse(message.data)
        } else if (message.type === 'syncStatus') {
            syncStatus.value = message.data.status
        }
    })

    watch(() => isLeader.value, (isLeader, wasLeader) => {
        if (isLeader && !wasLeader) {
            startSyncing()
        } else if (!isLeader && wasLeader) {
            stopSyncing()
        }
    })
    
    let syncAbortController: AbortController | undefined

    async function startSyncing() {
        stopSyncing()
        syncAbortController = new AbortController()
        while (syncAbortController) {
            try {
                const syncRequestParams: ApiV3SyncRequest = { timeout: 30000, since: getNextBatch() ?? '' }
                if (fullSyncRequired.value == true || !syncRequestParams.since) {
                    syncRequestParams.timeout = 0
                    syncRequestParams.since = ''
                    fullSyncRequired.value = false
                }
                const syncResponse = await fetchJson<ApiV3SyncResponse>(
                    `${homeserverBaseUrl.value}/_matrix/client/v3/sync?${new URLSearchParams(syncRequestParams as never)}`,
                    {
                        useAuthorization: true,
                        jsonSchema: ApiV3SyncResponseSchema,
                        signal: syncAbortController.signal,
                    }
                )
                populateAllFromApiSyncResponse(syncResponse)
                broadcastMessage({ type: 'apiV3Sync', data: syncResponse })
                setNextBatch(syncResponse.nextBatch)
                syncStatus.value = 'online'
                if (syncRequestParams.timeout === 0) {
                    // Wait just in case some bug keeps it in a full sync loop.
                    await new Promise((resolve) => setTimeout(resolve, 5000))
                }
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    // Ignore - regular behavior.
                } else {
                    log.error('Error when calling sync API.', error)
                    syncStatus.value = 'offline'
                }
                await new Promise((resolve) => setTimeout(resolve, 5000))
            }
        }
    }

    async function stopSyncing() {
        syncAbortController?.abort()
        syncAbortController = undefined
    }

    async function initialize() {
        if (syncInitialized.value) return
        await until(() => !roomsLoading.value && !profilesLoading.value && !accountDataLoading.value)

        fullSyncRequired.value = (
            !!accountDataLoadError.value
            || !!roomsLoadError.value
            || !!profilesLoadError.value
            || !getNextBatch()
            || true // TODO - for debugging; remove.
        )

        if (isLeader.value) {
            startSyncing()
        }

        syncInitialized.value = true
    }

    if (getCurrentInstance()) {
        onUnmounted(() => {
            stopSyncing()
        })
    }

    return {
        getFriendlyErrorMessage: (error: Error | unknown) => getFriendlyErrorMessage(t, error),
        initialize,
        syncStatus,
        syncInitialized: computed(() => syncInitialized.value),
    }
}
