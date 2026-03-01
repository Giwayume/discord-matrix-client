<template>
    <div v-if="sessionStoreLoading || hasAuthenticatedSession" class="flex items-center justify-center h-dvh">
        <div class="mx-auto max-w-100">
            <div class="text-center mt-6 mb-2">
                {{ t('landing.loading') }}
            </div>
            <ProgressBar mode="indeterminate"></ProgressBar>
        </div>
    </div>
    <div v-else class="landing-page">
        <img class="landing-page__logo" src="/assets/images/logo-light.svg">
        <div class="landing-page__content p-8">
            <div class="landing-page__hero">
                <h1>{{ t('landing.title') }}</h1>
                <p>{{ t('landing.subtitle') }}</p>
                <div class="flex flex-wrap justify-center gap-6 mt-14">
                    <RouterLink :to="{ name: 'register' }" class="landing-page__register-button">{{ t('landing.registerButton') }}</RouterLink>
                    <RouterLink :to="{ name: 'login' }" class="landing-page__login-button">{{ t('landing.loginButton') }}</RouterLink>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session'

import ProgressBar from 'primevue/progressbar'

const router = useRouter()
const { t } = useI18n()

const sessionStore = useSessionStore()
const { loading: sessionStoreLoading, hasAuthenticatedSession } = storeToRefs(sessionStore)

watch(() => hasAuthenticatedSession.value, () => {
    if (hasAuthenticatedSession.value) {
        router.push({ name: 'home' })
    }
}, { immediate: true })

</script>

<style scoped lang="scss">
.landing-page {
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
.landing-page__logo {
    position: absolute;
    top: 3rem;
    left: 3rem;
}
.landing-page__content {
    color: var(--text-muted);
    width: 100%;
    max-width: 860px;
}
.landing-page__hero {
    h1 {
        font-family: "Bebas Neue",Arial,sans-serif;
        font-size: 40px;
        text-transform: uppercase;
        line-height: .857143;
        color: var(--text-strong);
        text-align: center;
        margin: 0 auto 1.125rem auto;
        max-width: 400px;
    }
    p {
        font-size: 1.125rem;
        line-height: 1.3;
        color: var(--text-strong);
        text-align: center;
    }
}
.landing-page__register-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    color: #23272a;
    border-radius: 12px;
    min-width: 232px;
    min-height: 56px;
    padding: 13.5px 24px;
    padding-top: 15px;
    padding-bottom: 15px;
    letter-spacing: .25px;
    font-weight: 400;
    font-size: 18px;
    line-height: 24px;
    text-align: center;
    transition: all .2s;
        transition-duration: 0.2s;
    transition-duration: .3s;
    text-decoration: none;

    &:hover {
        background: var(--plum-6);
        box-shadow: 0 8px 15px rgba(0,0,0,.2);
        text-decoration: none;
    }
}
.landing-page__login-button {
    display: flex;
    position: relative;
    align-items: center;
    justify-content: center;
    background: #5865f2;
    color: white;
    border-radius: 12px;
    min-width: 232px;
    min-height: 56px;
    padding: 13.5px 24px;
    padding-top: 15px;
    padding-bottom: 15px;
    letter-spacing: .25px;
    font-weight: 400;
    font-size: 18px;
    line-height: 24px;
    text-align: center;
    transition: all .2s;
        transition-duration: 0.2s;
    transition-duration: .3s;
    text-decoration: none;
    z-index: 1;

    &:after {
        opacity: 0;
        content: '';
        position: absolute;
        background-image: linear-gradient(rgba(0, 0, 0, 0) 0px, rgb(31, 29, 93) 130%);
        border-radius: 12px;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transition: opacity .3s ease;
        z-index: -1;
    }

    &:hover {
        text-decoration: none;
        &:after {
            opacity: 1;
        }        
    }
}
</style>