<template>
    <Button class="w-full mt-5" @click="fallbackRedirect">
        {{ t('login.loginButton') }}
        <div class="p-button-loading-dots" />
    </Button>
    <p class="text-sm mt-2">
        {{ t('login.registerPrompt') }}
        <RouterLink :to="{ name: 'register' }">{{ t('login.registerLink') }}</RouterLink>
    </p>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import Button from 'primevue/button'

const props = defineProps({
    homeserverBaseUrl: {
        type: String,
        default: '',
    },
    authType: {
        type: String,
        default: '',
    },
    session: {
        type: String,
        default: undefined,
    }
})

const { t } = useI18n()

function fallbackRedirect() {
    let fallbackUrl = `${props.homeserverBaseUrl}/_matrix/client/v3/auth/${props.authType}/fallback/web`
    if (props.session) {
        fallbackUrl += `?session=${props.session}`
    }
    window.open(fallbackUrl)
}

</script>