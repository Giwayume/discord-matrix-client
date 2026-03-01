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
    <div v-else ref="applicationContainer" class="application">
        <TitleBar :title="props.title" :titleIcon="props.titleIcon" />
        <div
            v-if="isMobileView"
            class="application__mobile-drawer-layout"
            :class="{
                'application__mobile-drawer-layout--dragging-drawer': isDraggingDrawer,
            }"
            :style="{
                '--application-main-sidebar-right-padding': sidebarOpenRightPadding + 'px',
            }"
            @pointerdown="onPointerDownMobileLayout"
            @pointermove.capture="onPointerMoveMobileLayout"
            @pointercancel="onPointerCancelMobileLayout"
        >
            <aside class="application__sidebar-list">
                <Spaces />
                <div class="application__sidebar-list__content-container">
                    <slot name="sidebar-list" />
                </div>
                <UserStatusSettings
                    @showUserSettings="userSettingsVisible = true"
                />
            </aside>
            <main
                class="application__main__content-container"
                :class="{
                    'application__main__content-container--animating': isAnimatingSidebarToggle,
                }"
                :style="{
                    '--application-main-sidebar-offset': sidebarOpenOffset + 'px',
                }"
            >
                <slot />
            </main>
        </div>
        <Splitter v-else>
            <SplitterPanel class="flex items-center justify-center" :size="leftPanelSize" :minSize="10">
                <aside class="application__sidebar-list">
                    <Spaces />
                    <div class="application__sidebar-list__content-container">
                        <slot name="sidebar-list" />
                    </div>
                    <UserStatusSettings
                        @showUserSettings="userSettingsVisible = true"
                    />
                </aside>
            </SplitterPanel>
            <SplitterPanel class="flex items-center justify-center" :size="mainPanelSize" :minSize="10">
                <main class="application__main__content-container">
                    <slot />
                </main>
            </SplitterPanel>
        </Splitter>
    </div>
    <UserSettings v-model:visible="userSettingsVisible" />
    <IdentityVerificationDialog v-if="identityVerificationFlowStarted" v-model:visible="identityVerificationVisible" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { until } from '@/utils/vue'
import { useApplication } from '@/composables/application'
import { useCryptoKeys } from '@/composables/crypto-keys'
import { useProfiles } from '@/composables/profiles'
import { useSync } from '@/composables/sync'
import { useCryptoKeysStore } from '@/stores/crypto-keys'
import { useSessionStore } from '@/stores/session'

import CrashError from './CrashError.vue'
import Spaces from './Spaces.vue'
import TitleBar from './TitleBar.vue'
import UserStatusSettings from './UserStatusSettings.vue'
const UserSettings = defineAsyncComponent(() => import('@/views/UserSettings.vue'))
const IdentityVerificationDialog = defineAsyncComponent(() => import('@/views/EncryptionSetup/IdentityVerificationDialog.vue'))

import ProgressBar from 'primevue/progressbar'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'

const router = useRouter()
const { t } = useI18n()
const {
    isMobileView,
    sidebarOpenRightPadding,
    sidebarOpenOffset,
    isAnimatingSidebarToggle,
} = useApplication()
const {
    getFriendlyErrorMessage: getFriendlyCryptoKeysErrorMessage,
    initialize: initializeCryptoKeys,
} = useCryptoKeys()
const {
    getFriendlyErrorMessage: getFriendlySyncErrorMessage,
    initialize: initializeSync,
    syncInitialized,
} = useSync()
const {
    getFriendlyErrorMessage: getFriendlyProfilesErrorMessage,
    initialize: initializeProfiles,
} = useProfiles()
const sessionStore = useSessionStore()
const {
    secureSessionInitialized,
    loading: sessionStoreLoading,
    hasAuthenticatedSession,
} = storeToRefs(sessionStore)
const {
    identityVerificationRequired,
} = storeToRefs(useCryptoKeysStore())

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

const applicationContainer = ref<HTMLDivElement>()

const leftPanelSize = ref<number>(380 / window.innerWidth * 100)
const mainPanelSize = ref<number>(100 - leftPanelSize.value)
const userSettingsVisible = ref<boolean>(false)

const identityVerificationFlowStarted = ref<boolean>(false)
const identityVerificationVisible = ref<boolean>(false)

const initializeErrorMessage = ref<string | null>(null)

const loading = computed(() => {
    return sessionStoreLoading.value || !syncInitialized.value
})

async function initialize() {
    initializeErrorMessage.value = null

    if (!secureSessionInitialized.value) {
        try {
            await initializeCryptoKeys()
        } catch (error) {
            initializeErrorMessage.value = getFriendlyCryptoKeysErrorMessage(error)
            return
        }

        if (identityVerificationRequired.value) {
            identityVerificationFlowStarted.value = true
            identityVerificationVisible.value = true
            await until(() => !identityVerificationVisible.value)
        }
    }

    const [syncSettled, profilesSettled] = await Promise.allSettled([
        ...(!syncInitialized.value ? [initializeSync()] : []),
        ...(!secureSessionInitialized.value ? [initializeProfiles()] : []),
    ])
    if (syncSettled?.status === 'rejected') {
        initializeErrorMessage.value = getFriendlySyncErrorMessage(syncSettled.reason)
        return
    }
    if (profilesSettled?.status === 'rejected') {
        initializeErrorMessage.value = getFriendlyProfilesErrorMessage(profilesSettled.reason)
        return
    }

    secureSessionInitialized.value = true
}

onMounted(async () => {
    window.addEventListener('resize', onWindowResize, true)
    window.addEventListener('pointerup', onPointerUpWindow, true)

    await until(() => !sessionStoreLoading.value)
    if (hasAuthenticatedSession.value) {
        initialize()
    } else {
        router.replace({ name: 'login' })
    }
})

onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize, true)
    window.removeEventListener('pointerup', onPointerUpWindow, true)
})

function onWindowResize() {
    isMobileView.value = window.innerWidth <= 800
    if (sidebarOpenOffset.value > 0) {
        sidebarOpenOffset.value = window.innerWidth - sidebarOpenRightPadding
    }
}

let primaryPointerDown: {
    pageX: number;
    pageY: number;
    sidebarOpenOffset: number;
    timestamp: number;
} | undefined = undefined
let isDraggingDrawer = ref<boolean | undefined>()

function pointDistance(p1x: number, p1y: number, p2x: number, p2y: number) {
    const dx = p2x - p1x
    const dy = p2y - p1y
    return Math.hypot(dx, dy)
}

function onPointerDownMobileLayout(event: PointerEvent) {
    if (!primaryPointerDown && event.isPrimary && event.button === 0) {
        isDraggingDrawer.value = undefined
        primaryPointerDown = {
            pageX: event.pageX,
            pageY: event.pageY,
            sidebarOpenOffset: sidebarOpenOffset.value,
            timestamp: window.performance.now(),
        }
    }
}
function onPointerMoveMobileLayout(event: PointerEvent) {
    if (!primaryPointerDown || isDraggingDrawer.value === false) return
    if (
        !isDraggingDrawer.value
        && pointDistance(event.pageX, event.pageY, primaryPointerDown.pageX, primaryPointerDown.pageY) > 8
        && Math.abs(event.pageX - primaryPointerDown.pageX) > Math.abs(event.pageY - primaryPointerDown.pageY)
        && (
            (sidebarOpenOffset.value === 0 && event.pageX > primaryPointerDown.pageX)
            || (sidebarOpenOffset.value > 0 && event.pageX < primaryPointerDown.pageX)
        )
    ) {
        isDraggingDrawer.value = true
    }
    if (isDraggingDrawer.value) {
        event.preventDefault()
        event.stopPropagation()
        sidebarOpenOffset.value = Math.max(0, Math.min(window.innerWidth - sidebarOpenRightPadding, primaryPointerDown.sidebarOpenOffset + event.pageX - primaryPointerDown.pageX))
    }
}
function onPointerCancelMobileLayout(event: PointerEvent) {
    onPointerUpWindow(event)
}
function onPointerUpWindow(event: PointerEvent) {
    if (primaryPointerDown && isDraggingDrawer.value) {
        isAnimatingSidebarToggle.value = true

        const distanceDragged = Math.abs(event.pageX - primaryPointerDown.pageX)
        const pixelsDraggedPerSecond = distanceDragged / (window.performance.now() - primaryPointerDown.timestamp) * 1000

        if (
            primaryPointerDown.sidebarOpenOffset > 0
            && event.pageX < primaryPointerDown.pageX
            && distanceDragged >= 30
            && pixelsDraggedPerSecond > 300
        ) {
            sidebarOpenOffset.value = 0
        } else if (
            primaryPointerDown.sidebarOpenOffset === 0
            && event.pageX > primaryPointerDown.pageX
            && distanceDragged >= 30
            && pixelsDraggedPerSecond > 300
        ) {
            sidebarOpenOffset.value = window.innerWidth - sidebarOpenRightPadding
        } else if (sidebarOpenOffset.value < (window.innerWidth - sidebarOpenRightPadding) / 2) {
            sidebarOpenOffset.value = 0
        } else {
            sidebarOpenOffset.value = window.innerWidth - sidebarOpenRightPadding
        }

        setTimeout(() => {
            isAnimatingSidebarToggle.value = false
        }, 300)
    }
    isDraggingDrawer.value = undefined
    primaryPointerDown = undefined
}
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
    overflow: hidden; // Hide overflow for mobile view, main slides right which creates horizontal scrollbar

    padding-top: env(safe-area-inset-top);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);

    > .p-splitter {
        flex-grow: 1;
    }

}

.application__sidebar-list {
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}
.application__sidebar-list__content-container {
    position: relative;
    flex-shrink: 1;
    display: flex;
    flex-direction: column;
    border-inline-start: 1px solid var(--app-frame-border);
    border-top: 1px solid var(--app-frame-border);
    border-start-start-radius: var(--radius-md);
    flex-grow: 1;
    height: calc(100% - 4rem);
}

.application__main__content-container {
    position: relative;
    flex-grow: 1;
    flex-shrink: 1;
    height: 100%;
    background: var(--background-base-lower);
    border-top: 1px solid var(--app-frame-border);
}

.application__mobile-drawer-layout {
    flex-grow: 1;
    position: relative;

    .application__sidebar-list {
        touch-action: pan-y;
        width: calc(100% - var(--application-main-sidebar-right-padding, 3.5rem));
        z-index: 0;
    }

    .application__main__content-container {
        z-index: 1;
        touch-action: pan-y;
        transform: translateX(var(--application-main-sidebar-offset, '0px'));

        &.application__main__content-container--animating {
            transition: transform 0.2s;
        }
    }

    &.application__mobile-drawer-layout--dragging-drawer {
        overscroll-behavior: none !important;
        touch-action: none !important;

        * {
            overscroll-behavior: none !important;
            user-select: none !important;
            touch-action: none !important;
        }

        :deep(.p-scrollpanel-content) {
            overflow: hidden !important;
        }
    }
}
</style>