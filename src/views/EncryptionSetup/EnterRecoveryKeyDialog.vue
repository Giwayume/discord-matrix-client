<template>
    <Dialog
        :visible="visible"
        modal
        :header="t('enterRecoveryKey.title')"
        :style="{ width: '100%', maxWidth: '30rem' }"
        @update:visible="(visible) => emit('update:visible', visible)"
    >
        <p class="text-(--text-muted)">{{ t('enterRecoveryKey.subtitle') }}</p>
        <form id="recovery-key-entry-dialog-form" action="javascript:void(0)" novalidate @submit="submit">
            
            <div class="p-staticlabel grow-1 flex flex-col gap-2 mt-5 mb-5">
                <label for="recovery-key-entry" class="text-(--text-strong)">{{ t('enterRecoveryKey.recoveryKey') }}</label>
                <div class="flex items-stretch">
                    <InputText
                        id="recovery-key-entry"
                        v-model.trim="formData.recoveryKey"
                        type="password"
                        :invalid="v$.recoveryKey.$invalid && v$.$dirty"
                        required
                        class="grow-1"
                        autocomplete="off"
                        @input="onInputRecoveryKey"
                    />
                    <span class="flex items-center shrink-1 px-4">{{ t('enterRecoveryKey.or') }}</span>
                    <Button severity="secondary" class="shrink-1" @click="uploadRecoveryKey">{{ t('enterRecoveryKey.uploadButton') }}</Button>
                </div>
                <Message v-if="(v$.recoveryKey.$invalid && v$.$dirty)" severity="error" size="small" variant="simple">
                    <template #icon>
                        <span class="pi pi-exclamation-circle !text-xs !leading-3 -mt-[1px]" aria-hidden="true" />
                    </template>
                    <template v-if="v$.recoveryKey.partialUnlock.$invalid">
                        {{ t('enterRecoveryKey.recoveryKeyPartialUnlock') }}
                    </template>
                    <template v-if="v$.recoveryKey.noMatch.$invalid">
                        {{ t('enterRecoveryKey.recoveryKeyNoMatch') }}
                    </template>
                    <template v-else-if="v$.recoveryKey.wrongFileType.$invalid">
                        {{ t('enterRecoveryKey.recoveryKeyWrongFileType') }}
                    </template>
                    <template v-else-if="v$.recoveryKey.required.$invalid">
                        {{ t('enterRecoveryKey.recoveryKeyRequired') }}
                    </template>
                    <template v-else>
                        {{ t('enterRecoveryKey.recoveryKeyInvalid') }}
                    </template>
                </Message>
            </div>
        </form>
        <template #footer>
            <Button severity="secondary" @click="emit('update:visible', false)">{{ t('enterRecoveryKey.backButton') }}</Button>
            <Button form="recovery-key-entry-dialog-form" type="submit">{{ t('enterRecoveryKey.continueButton') }}</Button>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { pickFile } from '@/utils/file-access'
import { EncryptionVerificationError } from '@/utils/error'

import { useCryptoKeys } from '@/composables/crypto-keys'
import { useCryptoKeysStore } from '@/stores/crypto-keys'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'

const { t } = useI18n()
const { installRecoveryKey } = useCryptoKeys()
const {
    secretKeyIdsMissing,
    crossSigningMasterKey,
    crossSigningUserSigningKey,
    crossSigningSelfSigningKey,
} = storeToRefs(useCryptoKeysStore())

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
    (e: 'success'): void
}>()

watch(() => props.visible, (visible, wasVisible) => {
    if (visible && !wasVisible) {
        formData.recoveryKey = ''
        v$.value.$reset()
    }
})

const formData = reactive({
    recoveryKey: '',
})

const formRules = {
    recoveryKey: {
        required,
        wrongFileType: () => !wrongFileUploaded.value,
        noMatch: () => !recoveryKeyNotMatch.value,
        partialUnlock: () => !partialUnlock.value,
        spaceInvariantLength: (value: string) => {
            return value.replace(/ /g, '').length === 48
        }
    },
}

const v$ = useVuelidate(formRules, formData)

const wrongFileUploaded = ref<boolean>(false)
const recoveryKeyNotMatch = ref<boolean>(false)
const partialUnlock = ref<boolean>(false)

function onInputRecoveryKey() {
    wrongFileUploaded.value = false
    partialUnlock.value = false
    recoveryKeyNotMatch.value = false
}

async function uploadRecoveryKey() {
    wrongFileUploaded.value = false
    partialUnlock.value = false
    recoveryKeyNotMatch.value = false
    try {
        const file = await pickFile({ multiple: false })
        const text = await file.text()
        if (text.length > 200 || text.replace(/ /g, '').length !== 48) {
            throw new Error('File contents doesn\'t look like a recovery key.')
        }
        formData.recoveryKey = text.trim()
    } catch (error) {
        formData.recoveryKey = ''
        wrongFileUploaded.value = true
        v$.value.$validate()
    }
}

async function submit() {
    if (!await v$.value.$validate()) return

    recoveryKeyNotMatch.value = false
    partialUnlock.value = false

    let error: Error | undefined
    for (const keyId of secretKeyIdsMissing.value) {
        try {
            await installRecoveryKey(keyId, formData.recoveryKey)
            error = undefined
            break
        } catch (e) {
            error = e as Error
        }
    }

    if (error instanceof EncryptionVerificationError) {
        recoveryKeyNotMatch.value = true
        return
    }

    if (
        (crossSigningMasterKey.value || crossSigningUserSigningKey.value || crossSigningSelfSigningKey.value)
        && (!crossSigningMasterKey.value || !crossSigningUserSigningKey.value || !crossSigningSelfSigningKey.value)
    ) {
        partialUnlock.value = true
        return
    }

    if (
        !crossSigningMasterKey.value && !crossSigningUserSigningKey.value && !crossSigningSelfSigningKey.value
    ) {
        recoveryKeyNotMatch.value = true
        return
    }

    emit('update:visible', false)
    emit('success')
}

</script>
