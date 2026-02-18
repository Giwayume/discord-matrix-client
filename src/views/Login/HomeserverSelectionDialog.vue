<template>
    <Dialog
        :visible="visible"
        modal
        :header="header"
        :style="{ width: '100%', maxWidth: '30rem' }"
        @update:visible="onUpdateVisible"
    >
        <slot name="subtitle" />
        <form id="homeserver-change-form" action="javascript:void(0)" @submit="submitHomeserver">
            <div class="p-staticlabel flex flex-col gap-2 mt-4">
                <label for="homeserver-host" class="text-(--text-strong)">{{ t('homeserverSelectionDialog.hostnameLabel') }}</label>
                <InputText
                    id="homeserver-host"
                    v-model.trim="formData.homeserverBaseUrl"
                    type="text"
                    :invalid="v$.homeserverBaseUrl.$invalid && v$.$dirty"
                    autocomplete="off"
                    :placeholder="defaultHomeserverUrl"
                    @input="hostChanged"
                />
                <Message v-if="(v$.homeserverBaseUrl.$invalid && v$.$dirty) && serverDiscoveryErrorMessage" severity="error" size="small" variant="simple">
                    <template #icon>
                        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="transparent" class=""></circle><path fill="var(--text-feedback-critical)" fill-rule="evenodd" d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm1.44-15.94L13.06 14a1.06 1.06 0 0 1-2.12 0l-.38-6.94a1 1 0 0 1 1-1.06h.88a1 1 0 0 1 1 1.06Zm-.19 10.69a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" clip-rule="evenodd" class=""></path></svg>
                    </template>
                    {{ serverDiscoveryErrorMessage }}
                </Message>
            </div>
            <p class="text-(--text-muted) text-sm mt-2">{{ t('homeserverSelectionDialog.hostnameHelp') }}</p>
        </form>
        <template #footer>
            <div class="flex items-center justify-between w-full">
                <a :href="matrixConceptsHomeserverLink" target="_blank">
                    {{ t('homeserverSelectionDialog.aboutHomeserversLink') }}<span class="pi pi-external-link ml-2 text-xs!"></span>
                </a>
                <Button form="homeserver-change-form" type="submit" :loading="serverDiscoveryLoading">
                    Continue
                    <div class="p-button-loading-dots" />
                </Button>
            </div>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import { useExternalLinks } from '@/composables/external-links'
import { useServerDiscovery, type ServerDiscovery } from '@/composables/server-discovery'
import { useVuelidate } from '@vuelidate/core'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'

const { t } = useI18n()
const { buildConfig } = useConfigStore()
const { matrixConceptsHomeserverLink } = useExternalLinks()
const defaultHomeserverUrl = buildConfig.defaultServerConfig['m.homeserver'].baseUrl;

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    header: {
        type: String,
        default: () => {
            const { t } = useI18n()
            return t('homeserverSelectionDialog.title')
        },
    },
    scenario: {
        type: String as PropType<'login' | 'register'>,
        default: 'login',
    },
    homeserverBaseUrl: {
        type: String,
        default: '',
    },
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
    (e: 'update:serverDiscovery', serverDiscovery: ServerDiscovery): void
}>()

const visible = ref<boolean>(false)
watch(() => props.visible, (newVisible, oldVisible) => {
    if (newVisible && !oldVisible) {
        resetForm()
    }
    visible.value = props.visible
}, { immediate: true })

function onUpdateVisible(visible: boolean) {
    emit('update:visible', visible)
}

const {
    loading: serverDiscoveryLoading,
    error: serverDiscoveryError,
    errorMessage: serverDiscoveryErrorMessage,
    serverDiscovery,
    reset: resetServerDiscovery,
    load: discoverServer,
} = useServerDiscovery(props.scenario)

const formData = reactive({
    homeserverBaseUrl: '',
})
watch(() => props.homeserverBaseUrl, () => {
    resetForm()
})

const formRules = {
    homeserverBaseUrl: {
        invalid: () => {
            return !serverDiscoveryError.value
        },
    },
}

const v$ = useVuelidate(formRules, formData)

function resetForm() {
    resetServerDiscovery()
    if (props.homeserverBaseUrl === defaultHomeserverUrl) {
        formData.homeserverBaseUrl = ''
    } else {
        formData.homeserverBaseUrl = props.homeserverBaseUrl
    }
}

function hostChanged() {
    serverDiscoveryError && resetServerDiscovery()
}

async function submitHomeserver() {
    if (!await v$.value.$validate()) return

    if (props.homeserverBaseUrl !== formData.homeserverBaseUrl) {
        const homeserverBaseUrl = formData.homeserverBaseUrl || defaultHomeserverUrl
        await discoverServer(homeserverBaseUrl)
        if (serverDiscoveryError.value == null) {
            emit('update:serverDiscovery', serverDiscovery.value)
            emit('update:visible', false)
        }
    } else {
        emit('update:visible', false)
    }
}
</script>