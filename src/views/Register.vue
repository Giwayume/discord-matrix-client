<template>
    <div class="register-page">
        <img class="register-page__logo" src="/assets/images/logo-light.svg">
        <form class="register-form p-8" action="javascript:void(0)" novalidate @submit="registerSubmit">
            <h1 class="text-2xl text-center text-(--text-strong) mb-2">{{ t('register.title') }}</h1>
            <!-- Homeserver Selection -->
            <div class="p-staticlabel flex flex-col gap-2 mt-5">
                <label for="register-homeserver" class="text-(--text-strong)">{{ t('register.homeserverLabel') }}</label>
                <div class="flex gap-2">
                    <span>{{ selectedServerHomeserverName }}</span>
                    <a href="javascript:void(0)" @click="homeserverSelectionDialogVisible = true">Edit</a>
                </div>
            </div>
            <HomeserverSelectionDialog
                v-model:visible="homeserverSelectionDialogVisible"
                :header="t('register.homeserverEditTitle')"
                :homeserverBaseUrl="selectedServerHomeserverBaseUrl"
                scenario="register"
                @update:serverDiscovery="(serverDiscovery) => updateServerDiscovery(serverDiscovery)"
            />
            <!-- Loading Animation During Server Discovery -->
            <template v-if="serverDiscoveryLoading">
                <div class="text-center mt-6 mb-2">
                    {{ t('register.homeserverLoading') }}
                </div>
                <ProgressBar mode="indeterminate"></ProgressBar>
            </template>
            <!-- Error Message for Server Discovery -->
            <template v-else-if="serverDiscoveryError">
                <Message severity="error" variant="simple" class="mt-6">
                    {{ t('errors.discoverHomeserver.title') }}<br>
                    {{ serverDiscoveryErrorMessage }}
                    <div v-if="homeserverSupportEmail" class="mt-4">
                        {{ t('login.supportEmailLabel') }}
                        <a :href="'mailto:' + homeserverSupportEmail">{{ homeserverSupportEmail }}</a>
                    </div>
                    <div v-if="homeserverSupportPageUrl" class="mt-4">
                        <a :href="homeserverSupportPageUrl">{{ t('login.supportPageLabel') }}</a>
                    </div>
                </Message>
                <div class="text-center mt-6">
                    <Button @click="retryDiscoverServer">{{ t('login.retryButton') }}</Button>
                </div>
            </template>
            <!-- Register Steps -->
            <RegisterFormCreateCredentials
                v-else
                :loading="registerLoading"
                :loginError="registerError"
                @update:formData="(event) => registerFormData = event"
            />
        </form>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import { useServerDiscovery, type ServerDiscovery } from '@/composables/server-discovery'
import { useRegister, type RegisterFormData } from '@/composables/register'

import HomeserverSelectionDialog from './Login/HomeserverSelectionDialog.vue'
import RegisterFormCreateCredentials from './Register/RegisterFormCreateCredentials.vue'

import ProgressBar from 'primevue/progressbar'

const { t } = useI18n()
const { buildConfig } = useConfigStore()

import type { ClientConfig } from '@/types'

const {
    loading: serverDiscoveryLoading,
    error: serverDiscoveryError,
    errorMessage: serverDiscoveryErrorMessage,
    serverDiscovery,
    override: overrideServerDiscovery,
    load: discoverServer,
} = useServerDiscovery('register')

const homeserverSelectionDialogVisible = ref<boolean>(false)

const homeserverSupportEmail = computed(() => {
    return serverDiscovery.value.support?.contacts?.find((contact) => {
        return contact.role === 'm.role.admin'
    })?.emailAddress
})

const homeserverSupportPageUrl = computed(() => {
    return serverDiscovery.value.support?.supportPage
})

const selectedServerClientConfig = ref<ClientConfig>(buildConfig.defaultServerConfig)
const selectedServerHomeserverBaseUrl = computed(() => {
    return selectedServerClientConfig.value['m.homeserver'].baseUrl
})
const selectedServerHomeserverName = computed(() => {
    return selectedServerClientConfig.value['m.homeserver'].serverName ?? selectedServerClientConfig.value['m.homeserver'].baseUrl
})

const { 
    loading: registerLoading,
    error: registerError,
    session: registerSession,
    register,
} = useRegister({ serverDiscovery })

const registerFormData = ref<RegisterFormData>({})

onMounted(() => {
    discoverServer(selectedServerHomeserverBaseUrl.value)
})

function updateServerDiscovery(newServerDiscovery: ServerDiscovery) {
    selectedServerClientConfig.value = newServerDiscovery.client ?? buildConfig.defaultServerConfig
    overrideServerDiscovery(newServerDiscovery)
}

function retryDiscoverServer() {
    discoverServer(selectedServerHomeserverBaseUrl.value)
}

function registerSubmit() {

}

</script>

<style scoped lang="scss">
.register-page {
    background-color: #161cbb;
    background-image: url('/assets/images/hero-dancing-lines-mobile.svg');
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 6rem 1rem 1rem 1rem;

    @media screen and (min-width: 860px) {
        background-image: url('/assets/images/hero-dancing-lines.svg');
    }
}
.register-page__logo {
    position: absolute;
    top: 3rem;
    left: 3rem;
}
.register-form {
    background: var(--modal-background);
    border-radius: var(--radius-sm);
    box-shadow: var(--legacy-elevation-high);
    color: var(--text-muted);
    width: 100%;
    max-width: 30rem;
}
</style>