<template>
    <div class="login-page">
        <img class="login-page__logo" src="/assets/images/logo-light.svg">
        <form class="login-form p-8" action="javascript:void(0)" novalidate @submit="loginSubmit">
            <h1 class="text-2xl text-center text-(--text-strong) mb-2">{{ t('login.title') }}</h1>
            <p class="text-center text-(--text-default)">{{ t('login.subtitle') }}</p>
            <!-- Homeserver Selection -->
            <div class="p-staticlabel flex flex-col gap-2 mt-5">
                <label for="login-homeserver" class="text-(--text-strong)">{{ t('login.homeserverLabel') }}</label>
                <div class="flex gap-2">
                    <span>{{ selectedServerHomeserverName }}</span>
                    <a href="javascript:void(0)" @click="homeserverSelectionDialogVisible = true">Edit</a>
                </div>
            </div>
            <HomeserverSelectionDialog
                v-model:visible="homeserverSelectionDialogVisible"
                :homeserverBaseUrl="selectedServerHomeserverBaseUrl"
                scenario="login"
                @update:serverDiscovery="(serverDiscovery) => updateServerDiscovery(serverDiscovery)"
            />
            <!-- Loading Animation During Server Discovery -->
            <template v-if="serverDiscoveryLoading">
                <div class="text-center mt-6 mb-2">
                    {{ t('login.homeserverLoading') }}
                </div>
                <ProgressBar mode="indeterminate"></ProgressBar>
            </template>
            <!-- Error Message for Server Discovery -->
            <template v-else-if="serverDiscoveryError && serverDiscoveryErrorMessage">
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
            <!-- Login Steps -->
            <LoginFormPassword
                v-else-if="flowStep === 'm.login.password'"
                :loading="loginLoading"
                :loginError="loginError"
                @update:formData="(event) => loginFormData = event"
            />
            <LoginFormFallback v-else :homeserverBaseUrl="selectedServerHomeserverBaseUrl" :authType="flowStep" :session="loginSessionId" />
        </form>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import { useServerDiscovery, type ServerDiscovery } from '@/composables/server-discovery'
import { useLogin, type LoginFormData } from '@/composables/login'
import { useVuelidate } from '@vuelidate/core'

import HomeserverSelectionDialog from './Login/HomeserverSelectionDialog.vue'
import LoginFormPassword from './Login/LoginFormPassword.vue'
import LoginFormFallback from './Login/LoginFormFallback.vue'

import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressBar from 'primevue/progressbar'

import type { ClientConfig } from '@/types'

const router = useRouter()
const { t } = useI18n()
const { buildConfig } = useConfigStore()

const {
    loading: serverDiscoveryLoading,
    error: serverDiscoveryError,
    errorMessage: serverDiscoveryErrorMessage,
    serverDiscovery,
    override: overrideServerDiscovery,
    load: discoverServer,
} = useServerDiscovery('login')

const homeserverSelectionDialogVisible = ref<boolean>(false)

const homeserverSupportEmail = computed(() => {
    return serverDiscovery.value.support?.contacts?.find((contact) => {
        return contact.role === 'm.role.admin'
    })?.emailAddress
})

const homeserverSupportPageUrl = computed(() => {
    return serverDiscovery.value.support?.supportPage
})

const { 
    loading: loginLoading,
    error: loginError,
    sessionId: loginSessionId,
    login,
} = useLogin({ serverDiscovery })

const selectedServerClientConfig = ref<ClientConfig>(buildConfig.defaultServerConfig)
const selectedServerHomeserverBaseUrl = computed(() => {
    return selectedServerClientConfig.value['m.homeserver'].baseUrl
})
const selectedServerHomeserverName = computed(() => {
    return selectedServerClientConfig.value['m.homeserver'].serverName ?? selectedServerClientConfig.value['m.homeserver'].baseUrl
})

const v$ = useVuelidate()

const flowOrder = [/*'oidcNativeFlow',*/ 'm.login.password', /*'m.login.sso', 'm.login.cas'*/]
const flowStep = computed(() => {
    for (const flowType of flowOrder) {
        if (serverDiscovery.value.loginFlows?.find((flow) => flow.type === flowType)) {
            return flowType
        }
    }
    return serverDiscovery.value.loginFlows?.[0]?.type ?? 'fallback'
})

const loginFormData = ref<LoginFormData>({})

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

async function loginSubmit() {
    if (!await v$.value.$validate()) return

    await login(loginFormData.value)
    if (!loginError.value) {
        router.push({ name: 'home' })
    }
}
</script>

<style scoped lang="scss">
.login-page {
    background-color: #161cbb;
    background-image: url('/assets/images/hero-dancing-lines-mobile.svg');
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    padding: 6rem 1rem 1rem 1rem;

    @media screen and (min-width: 860px) {
        background-image: url('/assets/images/hero-dancing-lines.svg');
    }
}
.login-page__logo {
    position: absolute;
    top: 3rem;
    left: 3rem;
}
.login-form {
    background: var(--modal-background);
    border-radius: var(--radius-sm);
    box-shadow: var(--legacy-elevation-high);
    color: var(--text-muted);
    width: 100%;
    max-width: 30rem;
}
</style>