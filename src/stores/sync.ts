import { nextTick, ref, toRaw, watch } from 'vue'
import { defineStore } from 'pinia'

import {
    loadTableKey as loadMatrixRiotSyncTableKey,
    saveTableKey as saveMatrixRiotSyncTableKey,
    deleteTableKey as deleteMatrixRiotSyncTableKey,
} from './database/matrix-js-sdk/riot-web-sync'

import {
    type ApiV3SyncResponse
} from '@/types'

export const useSyncStore = defineStore('sync', () => {

    const syncLoading = ref<boolean>(true)
    const syncError = ref<Error | null>(null)
    const sync = ref<ApiV3SyncResponse>({
        nextBatch: '',
    })
    loadMatrixRiotSyncTableKey('sync', '-').then((value) => {
        if (!value?.deviceLists) throw new SyntaxError('Sync data does not appear to be in the correct format.')
        sync.value = value
    }).catch(() => {
        // Ignore - sync will reset
    }).finally(() => {
        syncLoading.value = false
    })
    watch(() => sync.value, () => {
        if (!syncLoading.value && !syncError.value) {
            saveMatrixRiotSyncTableKey('sync', '-', toRaw(sync.value)).catch((error) => {
                syncError.value = error
            })
        }
    })

    async function reset() {
        syncLoading.value = true
        deleteMatrixRiotSyncTableKey('sync', '-')
        sync.value = { nextBatch: '' }
        await nextTick()
    }

    return { reset, sync, syncError, syncLoading }
})
