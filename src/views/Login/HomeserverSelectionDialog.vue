<template>
    <Dialog
        :visible="visible"
        modal
        :header="header"
        :style="{ width: 'calc(100% - 1rem)', maxWidth: '30rem' }"
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
                    autocorrect="off"
                    autocapitalize="off"
                    :placeholder="defaultHomeserverUrl"
                    @input="hostChanged"
                />
                <Message v-if="(v$.homeserverBaseUrl.$invalid && v$.$dirty) && serverDiscoveryErrorMessage" severity="error" size="small" variant="simple">
                    <template #icon>
                        <span class="pi pi-exclamation-circle !text-xs !leading-3 -mt-[1px]" aria-hidden="true" />
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