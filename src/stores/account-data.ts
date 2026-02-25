import { computed, ref, toRaw, watch } from 'vue'
import { defineStore } from 'pinia'
import { createLogger } from '@/composables/logger'

import { useBroadcast } from '@/composables/broadcast'

import {
    getAllTableKeys as getAllDiscortixTableKeys,
    loadTableKey as loadDiscortixTableKey,
    saveTableKey as saveDiscortixTableKey,
} from '@/stores/database/discortix'

import {
    eventContentSchemaByType,
    type ApiV3SyncAccountDataEvent,
    type ApiV3SyncResponse,
} from '@/types'

const log = createLogger(import.meta.url)

export const useAccountDataStore = defineStore('accountData', () => {
    const { isLeader } = useBroadcast()

    const accountDataLoading = ref<boolean>(true)
    const accountDataLoadError = ref<Error | null>(null)
    const accountData = ref<Record<string, any>>({})

    async function initialize() {
        try {
            const keys: string[] = await getAllDiscortixTableKeys('accountData')
            const fetchPromises: Array<Promise<[string, ApiV3SyncAccountDataEvent]>> = []
            for (const key of keys) {
                fetchPromises.push(loadDiscortixTableKey('accountData', key).then((accountData) => [key, accountData]))
            }
            const settleResults = await Promise.allSettled(fetchPromises)
            for (const settleResult of settleResults) {
                if (settleResult.status === 'fulfilled') {
                    const [key, data] = settleResult.value
                    accountData.value[key] = data
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                accountDataLoadError.value = error
            } else {
                accountDataLoadError.value = new Error('The thrown object was not an error.')
            }
        }
        accountDataLoading.value = false
    }
    initialize()

    async function populateFromApiV3SyncResponse(sync: ApiV3SyncResponse) {
        if (!sync.accountData?.events) return

        for (let accountDataItem of sync.accountData.events) {
            const schema = eventContentSchemaByType[accountDataItem.type as keyof typeof eventContentSchemaByType]
            const schemaParse = schema?.safeParse(accountDataItem.content)
            if (schema && !schemaParse?.success) {
                log.warn(`Skipped loading ${accountDataItem.type} account data event because it failed schema validation.`, schemaParse?.error)
                continue
            }
            accountData.value[accountDataItem.type] = accountDataItem.content

            if (isLeader.value) {
                saveDiscortixTableKey('accountData', accountDataItem.type, toRaw(accountDataItem.content)).catch(() => {
                    // Maybe this isn't the end of the world.
                })
            }
        }
    }

    function populateByType(type: string, data: any) {
        accountData.value[type] = data
    }

    return {
        accountDataLoading,
        accountDataLoadError,
        accountData: computed(() => accountData.value),
        populateFromApiV3SyncResponse,
        populateByType,
    }
})