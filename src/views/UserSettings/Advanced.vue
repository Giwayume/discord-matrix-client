<template>
    <div class="my-16 mx-auto max-w-174">
        <section class="px-3 py-2">
            <div class="flex mb-6 gap-6">
                <div class="grow-1">
                    <label
                        for="user-settings-advanced-developer-mode"
                        class="text-md mb-1 text-(--text-strong)"
                    >{{ t('userSettings.advanced.developerMode') }}</label>
                    <p class="text-sm text-(--text-subtle)">{{ t('userSettings.advanced.developerModeDescription') }}</p>
                </div>
                <div class="shrink-1">
                    <ToggleSwitch id="user-settings-advanced-developer-mode" v-model="settings.isDeveloperMode" />
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { useClientSettingsStore } from '@/stores/client-settings'

import ToggleSwitch from 'primevue/toggleswitch'

const { t } = useI18n()
const { settings } = useClientSettingsStore()

</script>