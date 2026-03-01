<template>
    <Dialog
        :visible="visible"
        modal
        :header="t('importRoomKeys.title')"
        :style="{ width: '100%', maxWidth: '30rem' }"
        @update:visible="(visible) => emit('update:visible', visible)"
    >
        <p class="text-(--text-muted)">{{ t('importRoomKeys.subtitle') }}</p>
        <form id="import-room-keys-dialog-form" action="javascript:void(0)" novalidate @submit="submit">
            <div class="flex gap-4 items-center mt-5">
                <Button severity="secondary" class="shrink-1 text-nowrap" @click="selectBackupFile">{{ t('importRoomKeys.backupFile') }}</Button>
                <p v-if="formData.backupFile" class="grow-1 overflow-hidden text-ellipsis">{{ formData.backupFile.name }}</p>
            </div>
            <Message v-if="(v$.backupFile.$invalid && v$.$dirty)" severity="error" size="small" variant="simple" class="mt-2">
                <template #icon>
                    <span class="pi pi-exclamation-circle !text-xs !leading-3 -mt-[1px]" aria-hidden="true" />
                </template>
                <template v-if="v$.backupFile.required.$invalid">
                    {{ t('importRoomKeys.backupFileRequired') }}
                </template>
                <template v-else>
                    {{ t('importRoomKeys.backupFileInvalid') }}
                </template>
            </Message>
            <div class="p-staticlabel grow-1 flex flex-col gap-2 mt-5 mb-5">
                <label for="room-keys-backup-passphrase-entry" class="text-(--text-strong)">{{ t('importRoomKeys.passphrase') }}</label>
                <InputText
                    id="room-keys-backup-passphrase-entry"
                    v-model.trim="formData.passphrase"
                    type="password"
                    :invalid="v$.passphrase.$invalid && v$.$dirty"
                    required
                    class="grow-1"
                    autocomplete="off"
                />
                <Message v-if="(v$.passphrase.$invalid && v$.$dirty)" severity="error" size="small" variant="simple">
                    <template #icon>
                        <span class="pi pi-exclamation-circle !text-xs !leading-3 -mt-[1px]" aria-hidden="true" />
                    </template>
                    <template v-if="v$.passphrase.required.$invalid">
                        {{ t('importRoomKeys.passphraseRequired') }}
                    </template>
                    <template v-else>
                        {{ t('importRoomKeys.passphraseInvalid') }}
                    </template>
                </Message>
            </div>
        </form>
        <template #footer>
            <Button severity="secondary" @click="emit('update:visible', false)">{{ t('importRoomKeys.cancelButton') }}</Button>
            <Button form="import-room-keys-dialog-form" type="submit" :loading="parsingFile">
                {{ t('importRoomKeys.importButton') }}
                <div class="p-button-loading-dots" />
            </Button>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { pickFile } from '@/utils/file-access'
import { decryptMegolmKeyFile } from '@/utils/megolm-export'
import { InvalidFileError } from '@/utils/error'

import { useCryptoKeysStore } from '@/stores/crypto-keys'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'

const { t } = useI18n()
const toast = useToast()
const cryptoKeysStore = useCryptoKeysStore()
const { populateRoomKeysFromMegolmBackup } = cryptoKeysStore

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
        formData.backupFile = null,
        formData.passphrase = ''
        v$.value.$reset()
    }
})

const parsingFile = ref<boolean>(false)

const formData = reactive({
    backupFile: null as File | null,
    passphrase: '',
})

const formRules = {
    backupFile: {
        required,
        wrongFileType: () => !wrongFileUploaded.value,
    },
    passphrase: {
        required,
        invalid: () => !passphraseInvalid.value,
    },
}

const v$ = useVuelidate(formRules, formData)

const wrongFileUploaded = ref<boolean>(false)
const passphraseInvalid = ref<boolean>(false)

async function selectBackupFile() {
    wrongFileUploaded.value = false
    try {
        formData.backupFile = await pickFile({ multiple: false })
    } catch (error) {
        wrongFileUploaded.value = true
        v$.value.$validate()
    }
}

async function submit() {
    parsingFile.value = true
    wrongFileUploaded.value = false
    passphraseInvalid.value = false

    if (!await v$.value.$validate()) return

    try {
        const megolmSessionData = await formData.backupFile?.arrayBuffer()
        if (!megolmSessionData) throw new InvalidFileError()
        const megolmKeys = await decryptMegolmKeyFile(megolmSessionData, formData.passphrase)
        populateRoomKeysFromMegolmBackup(JSON.parse(megolmKeys))
        parsingFile.value = false
    } catch (error) {
        if (error instanceof InvalidFileError) {
            wrongFileUploaded.value = true
        } else {
            passphraseInvalid.value = true
        }
        parsingFile.value = false
        return
    }

    toast.add({ severity: 'success', summary: t('importRoomKeys.importSuccessToast'), life: 3000 })

    emit('update:visible', false)
    emit('success')
}

</script>
