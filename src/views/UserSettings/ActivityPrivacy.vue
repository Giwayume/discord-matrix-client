<template>
    <div class="my-16 mx-auto max-w-174">
        <section class="px-3 py-2">
            <div class="mb-6">
                <h2 class="text-2xl leading-6 font-normal mb-1 text-(--text-strong)">{{ t('userSettings.activityPrivacy.activitySharingHeading') }}</h2>
            </div>
            <div class="flex mb-6 gap-6">
                <div class="grow-1">
                    <label
                        for="user-settings-activity-privacy-send-typing-indicators"
                        class="text-md mb-1 text-(--text-strong)"
                    >{{ t('userSettings.activityPrivacy.typingIndicators') }}</label>
                    <p class="text-sm text-(--text-subtle)">{{ t('userSettings.activityPrivacy.typingIndicatorsDescription') }}</p>
                </div>
                <div class="shrink-1">
                    <ToggleSwitch id="user-settings-activity-privacy-send-typing-indicators" v-model="settings.sendTypingIndicators" />
                </div>
            </div>
            <div class="flex mb-6 gap-6">
                <div class="grow-1">
                    <label
                        for="user-settings-activity-privacy-send-read-receipts"
                        class="text-md mb-1 text-(--text-strong)"
                    >{{ t('userSettings.activityPrivacy.readReceipts') }}</label>
                    <p class="text-sm text-(--text-subtle)">{{ t('userSettings.activityPrivacy.readReceiptsDescription') }}</p>
                </div>
                <div class="shrink-1">
                    <ToggleSwitch id="user-settings-activity-privacy-send-read-receipts" v-model="settings.sendReadReceipts" />
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useClientSettingsStore } from '@/stores/client-settings'

import ToggleSwitch from 'primevue/toggleswitch'

const { t } = useI18n()
const { settings } = useClientSettingsStore()

</script>