<template>
    <div class="my-16 mx-auto max-w-174">
        <section class="px-3 py-2">
            <div class="mb-6">
                <h2 class="text-2xl leading-6 font-normal mb-1 text-(--text-strong)">{{ t('userSettings.encryption.identityHeading') }}</h2>
                <p class="text-sm text-(--text-subtle)">{{ t('userSettings.encryption.identityDescription') }}</p>
            </div>
            <Button severity="secondary" size="small">
                <span class="pi pi-key !text-sm" aria-hidden="true" />
                {{ t('userSettings.encryption.changeIdentityRecoveryKeyButton') }}
            </Button>
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
    </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const ImportRoomKeysDialog = defineAsyncComponent(() => import('@/views/EncryptionSetup/ImportRoomKeysDialog.vue'))

import Button from 'primevue/button'

const { t } = useI18n()

const importRoomKeysDialogVisible = ref<boolean>(false)

</script>