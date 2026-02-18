<template>
    <CrashError v-if="initializeErrorMessage" :detailsMessage="initializeErrorMessage" @reload="initialize" />
    <div v-else-if="loading" class="flex items-center justify-center h-dvh">
        <div class="mx-auto max-w-100">
            <div class="text-center mt-6 mb-2">
                {{ t('landing.loading') }}
            </div>
            <ProgressBar mode="indeterminate"></ProgressBar>
        </div>
    </div>
    <div v-else class="application">
        <TitleBar :title="props.title" :titleIcon="props.titleIcon" />
        <Splitter>
            <SplitterPanel class="flex items-center justify-center" :size="leftPanelSize" :minSize="10">
                <div class="application__sidebar-list">
                    <Spaces />
                    <div class="application__sidebar-list__content-container">
                        <slot name="sidebar-list" />
                    </div>
                    <UserStatusSettings />
                </div>
            </SplitterPanel>
            <SplitterPanel class="flex items-center justify-center" :size="mainPanelSize" :minSize="10">
                <div class="application__main__content-container">
                    <slot />
                </div>
            </SplitterPanel>
        </Splitter>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { until } from '@/utils/vue'
import { useProfiles } from '@/composables/profiles'
import { useSync } from '@/composables/sync'
import { useSessionStore } from '@/stores/session'

import CrashError from './CrashError.vue'
import Spaces from './Spaces.vue'
import TitleBar from './TitleBar.vue'
import UserStatusSettings from './UserStatusSettings.vue'

import ProgressBar from 'primevue/progressbar'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'

const router = useRouter()
const { t } = useI18n()
const {
    getFriendlyErrorMessage: getFriendlySyncErrorMessage,
    initialize: initializeSync,
    syncInitialized,
} = useSync()
const {
    getFriendlyErrorMessage: getFriendlyProfilesErrorMessage,
    initialize: initializeProfiles,
} = useProfiles()

const props = defineProps({
    title: {
        type: String,
        default: '',
    },
    titleIcon: {
        type: String,
        default: '',
    },
})

const leftPanelSize = ref<number>(380 / window.innerWidth * 100)
const mainPanelSize = ref<number>(100 - leftPanelSize.value)

const sessionStore = useSessionStore()
const {
    loading: sessionStoreLoading,
    hasAuthenticatedSession,
} = storeToRefs(sessionStore)

const initializeErrorMessage = ref<string | null>(null)

const loading = computed(() => {
    return sessionStoreLoading.value || !syncInitialized.value
})

async function initialize() {
    initializeErrorMessage.value = null
    const [syncSettled, profilesSettled] = await Promise.allSettled([
        ...(!syncInitialized.value ? [initializeSync()] : []),
        initializeProfiles(),
    ])
    if (syncSettled?.status === 'rejected') {
        initializeErrorMessage.value = getFriendlySyncErrorMessage(syncSettled.reason)
        return
    }
    if (profilesSettled?.status === 'rejected') {
        initializeErrorMessage.value = getFriendlyProfilesErrorMessage(profilesSettled.reason)
        return
    }
}

onMounted(async () => {
    await until(() => !sessionStoreLoading.value)
    if (hasAuthenticatedSession.value) {
        initialize()
    } else {
        router.replace({ name: 'login' })
    }
})
</script>

<style lang="scss" scoped>
.application {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--background-base-lowest);

    > .p-splitter {
        flex-grow: 1;
    }
}

.application__sidebar-list {
    display: flex;
    position: relative;
    height: 100%;
    flex-grow: 1;
}
.application__sidebar-list__content-container {
    border-inline-start: 1px solid var(--app-frame-border);
    border-top: 1px solid var(--app-frame-border);
    border-start-start-radius: var(--radius-md);
    flex-grow: 1;
    height: calc(100% - 4rem);
}

.application__main__content-container {
    flex-grow: 1;
    height: 100%;
    background: var(--background-base-lower);
    border-top: 1px solid var(--app-frame-border);
}
</style>