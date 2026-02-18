import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n, type ComposerTranslation } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { useSyncStore } from '@/stores/sync'
import { fetchJson, HttpError } from '@/utils/fetch'
import { until } from '@/utils/vue'
import * as z from 'zod'

import {
    type ApiV3SyncRequest,
    type ApiV3SyncResponse, ApiV3SyncResponseSchema
} from '@/types/api-events'

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
    const { homeserverBaseUrl } = storeToRefs(useSessionStore())
    const { sync, syncLoading } = storeToRefs(useSyncStore())

    async function initialize() {
        if (syncInitialized.value) return

        await until(() => !syncLoading.value)

        if (!sync.value.nextBatch) {
            const initialSyncRequestParams: ApiV3SyncRequest = { timeout: 0, since: '' }
            sync.value = await fetchJson<ApiV3SyncResponse>(
                `${homeserverBaseUrl.value}/_matrix/client/v3/sync?${new URLSearchParams(initialSyncRequestParams as never)}`,
                {
                    useAuthorization: true,
                    jsonSchema: ApiV3SyncResponseSchema
                },
            )
        }

        syncInitialized.value = true
    }

    return {
        getFriendlyErrorMessage: (error: Error | unknown) => getFriendlyErrorMessage(t, error),
        initialize,
        syncInitialized: computed(() => syncInitialized.value),
    }
}
