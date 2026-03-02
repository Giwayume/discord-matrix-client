<template>
    <Dialog
        :visible="visible"
        modal
        :header="t('fixDecryption.title')"
        :style="{ width: 'calc(100% - 1rem)', maxWidth: '30rem' }"
        @update:visible="(visible) => emit('update:visible', visible)"
    >
        <template v-if="encryptionNotSupported">
            {{ t('fixDecryption.deviceEncryptionNotSupported') }}
        </template>
        <template v-else>
            {{ t('fixDecryption.unknownError') }}
        </template>
        <!-- <p class="text-(--text-default)">{{ t('identityVerification.subtitle') }}</p>
        <div class="flex items-stretch justify-center gap-2 my-5">
            <Button severity="secondary">
                <div class="flex flex-col items-center">
                    <span class="pi pi-mobile !text-2xl mb-2" aria-hidden="true" />
                    {{ t('identityVerification.verifyWithAnotherDeviceButton') }}
                </div>
            </Button>
            <Button severity="secondary" @click="recoveryKeyDialogVisible = true">
                <div class="flex flex-col items-center">
                    <span class="pi pi-key !text-2xl mb-2" aria-hidden="true" />
                    {{ t('identityVerification.verifyWithRecoveryKeyButton') }}
                </div>
            </Button>
        </div>
        <p class="text-sm text-(--text-muted)">
            {{ t('identityVerification.lostRecoveryMethods') }}
            <a href="javascript:void(0)">{{ t('identityVerification.resetIdentityLink') }}</a>
        </p> -->
    </Dialog>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { useCryptoKeysStore } from '@/stores/crypto-keys'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

const { t } = useI18n()
const {
    encryptionNotSupported,
} = storeToRefs(useCryptoKeysStore())

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    roomId: {
        type: String,
        default: undefined,
    },
    eventId: {
        type: String,
        default: undefined,
    },
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
}>()

</script>
