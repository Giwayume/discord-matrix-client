import { nextTick, reactive, ref, toRaw, watch } from 'vue'
import { defineStore } from 'pinia'

import { createLogger } from '@/composables/logger'
import { useBroadcast } from '@/composables/broadcast'

import {
    loadTableKey as loadDiscortixTableKey,
    saveTableKey as saveDiscortixTableKey,
} from './database/discortix'

import {
    type BroadcastUpdateClientSettingMessage,
    ClientSettingsSchema, type ClientSettings,
} from '@/types'

const log = createLogger(import.meta.url)

export const useClientSettingsStore = defineStore('clientSettings', () => {
    const { onTabMessage, broadcastMessageFromTab } = useBroadcast({ permanent: true })

    const disableWatchers = ref<boolean>(false)

    const settings = reactive<ClientSettings>({
        isDeveloperMode: false,
        sendReadReceipts: true,
        sendTypingIndicators: true,
    })

    const loadSettingsPromises: Promise<void>[] = []
    for (const key in settings) {
        loadSettingsPromises.push(
            loadDiscortixTableKey('clientSettings', key).then((value) => {
                if (ClientSettingsSchema.shape[key as keyof typeof ClientSettingsSchema.shape]?.safeParse(value).success) {
                    settings[key as keyof typeof settings] = value
                }
            })
        )
    }
    Promise.allSettled(loadSettingsPromises).then(() => {
        for (const key in settings) {
            watch(() => [key, settings[key as keyof typeof settings]] as const, ([key, value]) => {
                if (disableWatchers.value) return
                saveDiscortixTableKey('clientSettings', key, toRaw(value))
                broadcastMessageFromTab({
                    type: 'updateClientSetting',
                    data: { key, value },
                } satisfies BroadcastUpdateClientSettingMessage)
            }, { deep: true })
        }
    })

    onTabMessage((message) => {
        if (message.type === 'updateClientSetting') {
            disableWatchers.value = true
            try {
                if (ClientSettingsSchema.shape[message.data.key as keyof typeof ClientSettingsSchema.shape]?.parse(message.data.value)) {
                    settings[message.data.key as keyof typeof settings] = message.data.value
                }
            } catch (error) {
                log.error('Error updating client setting from other tab. Ignoring.', error)
            } finally {
                nextTick(() => {
                    disableWatchers.value = false
                })
            }
        }
    })

    return {
        settings,
    }
})
