<template>
    <div class="my-16 mx-auto max-w-174">
        <section class="px-3 py-2">
            <div class="mb-6">
                <h2 class="text-2xl leading-6 font-normal mb-1 text-(--text-strong)">{{ t('userSettings.encryption.identityHeading') }}</h2>
                <p class="text-sm text-(--text-subtle)">{{ t('userSettings.encryption.identityDescription') }}</p>
            </div>
            <template v-if="identityVerificationRequired">
                <Message severity="error" variant="simple" class="my-6">
                    <template #icon>
                        <span class="pi pi-exclamation-circle !text-xs !leading-3 -mt-[1px]" aria-hidden="true" />
                    </template>
                    {{ t('userSettings.encryption.identityVerificationRequired') }}
                </Message>
                <Button severity="danger" size="small" @click="identityVerificationDialogVisible = true">
                    <span class="pi pi-key !text-sm" aria-hidden="true" />
                    {{ t('userSettings.encryption.verifyIdentityButton') }}
                </Button>
                <IdentityVerificationDialog v-model:visible="identityVerificationDialogVisible" />
            </template>
            <template v-else>
                <Button severity="secondary" size="small">
                    <span class="pi pi-key !text-sm" aria-hidden="true" />
                    {{ t('userSettings.encryption.changeIdentityRecoveryKeyButton') }}
                </Button>
            </template>
        </section>
        <div class="border-t border-(--border-subtle) my-10 mx-3" />
        <section class="px-3 py-2">
            <div class="mb-6">
                <h2 class="text-2xl leading-6 font-normal mb-1 text-(--text-strong)">{{ t('userSettings.encryption.roomKeysHeading') }}</h2>
                <p class="text-sm text-(--text-subtle)">{{ t('userSettings.encryption.roomKeysDescription') }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <Button severity="secondary" size="small">
                    <span class="pi pi-download !text-sm" aria-hidden="true" />
                    {{ t('userSettings.encryption.exportRoomKeysButton') }}
                </Button>
                <Button severity="secondary" size="small" @click="importRoomKeysDialogVisible = true">
                    <span class="pi pi-upload !text-sm" aria-hidden="true" />
                    {{ t('userSettings.encryption.importRoomKeysButton') }}
                </Button>
                <ImportRoomKeysDialog v-model:visible="importRoomKeysDialogVisible" />
            </div>
        </section>
        <div class="border-t border-(--border-subtle) my-10 mx-3" />
        <section class="px-3 py-2">
            <div class="mb-6">
                <h2 class="text-2xl leading-6 font-normal mb-1 text-(--text-strong)">{{ t('userSettings.encryption.warningsHeader') }}</h2>
            </div>
            <div class="flex mb-6 gap-6">
                <div class="grow-1">
                    <label
                        for="user-settings-encryption-unencrypted-warning-toggle"
                        class="text-md mb-1 text-(--text-strong)"
                    >{{ t('userSettings.encryption.warnUnencryptedMessage') }}</label>
                    <p class="text-sm text-(--text-subtle)">{{ t('userSettings.encryption.warnUnencryptedMessageDescription') }}</p>
                </div>
                <div class="shrink-1">
                    <ToggleSwitch id="user-settings-encryption-unencrypted-warning-toggle" v-model="settings.warnUnencryptedMessageInEncryptedRoom" />
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { useClientSettingsStore } from '@/stores/client-settings'
import { useCryptoKeysStore } from '@/stores/crypto-keys'

const IdentityVerificationDialog = defineAsyncComponent(() => import('@/views/EncryptionSetup/IdentityVerificationDialog.vue'))
const ImportRoomKeysDialog = defineAsyncComponent(() => import('@/views/EncryptionSetup/ImportRoomKeysDialog.vue'))

import Button from 'primevue/button'
import Message from 'primevue/message'
import ToggleSwitch from 'primevue/toggleswitch'

const { t } = useI18n()
const { settings } = useClientSettingsStore()
const {
    identityVerificationRequired,
} = storeToRefs(useCryptoKeysStore())

const identityVerificationDialogVisible = ref<boolean>(false)
const importRoomKeysDialogVisible = ref<boolean>(false)

</script>