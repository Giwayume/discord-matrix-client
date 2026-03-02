<template>
    <Dialog
        :visible="visible"
        modal
        :draggable="false"
        :header="selectedMenuTitle"
        :style="{
            width: '100%',
            maxWidth: 'calc(100dvw - 5rem)',
            height: 'calc(100dvh - 4rem)',
            maxHeight: 'none',
        }"
        class="p-dialog-lg-fullwidth !p-0 !overflow-hidden"
        @update:visible="onUpdateVisible"
    >
        <template #container="{ closeCallback }">
            <div
                class="flex flex-row w-full h-full relative"
                @pointerdown="onPointerDownMobileLayout"
                @pointermove="onPointerMoveMobileLayout"
                @pointercancel="onPointerCancelMobileLayout"
            >
                <aside class="p-dialog-sidebar flex flex-col">
                    <div class="pl-1 pr-4">
                        <div class="flex">
                            <Button variant="text" severity="secondary" class="!p-2 mb-2 w-full !justify-start grow-1">
                                <AuthenticatedImage :mxcUri="authenticatedUserAvatarUrl" type="thumbnail" :width="48" :height="48" method="scale">
                                    <template v-slot="{ src }">
                                        <Avatar :image="src" shape="circle" size="xlarge" :aria-label="t('layout.userAvatarImage')" class="shrink-0" />
                                    </template>
                                    <template #error>
                                        <Avatar icon="pi pi-user" shape="circle" size="xlarge" :aria-label="t('layout.userAvatarImage')" class="shrink-0" />
                                    </template>
                                </AuthenticatedImage>
                                <div class="flex flex-col items-start grow-1 ml-4 overflow-hidden">
                                    <div class="text-(--text-strong) overflow-hidden text-ellipsis w-full text-left">
                                        {{ authenticatedUserDisplayName }}
                                    </div>
                                    <div class="text-sm">
                                        {{ t('userSettings.editProfile') }}
                                        <span class="pi pi-pencil !text-xs" aria-hidden="true" />
                                    </div>
                                </div>
                            </Button>
                            <Button
                                icon="pi pi-times"
                                severity="secondary"
                                variant="text"
                                class="p-dialog-mobile-only-button !p-0 !w-10 !h-10"
                                :style="{ '--p-icon-size': '1.125rem' }"
                                :aria-label="t('userSettings.navBackButton')"
                                @click="closeCallback"
                            />
                        </div>
                        <IconField>
                            <InputIcon class="pi pi-search" />
                            <InputText class="w-full" :placeholder="t('userSettings.search')" />
                        </IconField>
                    </div>
                    <ScrollPanel class="grow-1 overflow-hidden">
                        <div class="pt-3 pr-3 pb-4 pl-1">
                            <Menu :model="menuItems">
                                <template #item="{ item, props }">
                                    <a
                                        class="p-menu-item-link"
                                        :class="{ 'p-menu-item-link-active': item.key === selectedMenuItem.key }"
                                        tabindex="-1"
                                    >
                                        <span class="p-menu-item-icon" :class="item.icon" />
                                        <span class="p-menu-item-label">{{ item.label }}</span>
                                    </a>
                                </template>
                            </Menu>
                            <div class="px-1">
                                <div class="my-3 border-t border-(--border-subtle)" />
                            </div>
                            <Button class="!justify-start !p-2 w-full" severity="danger" variant="text" @click="logoutConfirmVisible = true">
                                <span class="pi pi-sign-out" aria-hidden="true" />
                                {{ t('userSettings.menu.logOut') }}
                            </Button>
                        </div>
                    </ScrollPanel>
                </aside>
                <div
                    class="p-dialog-main flex flex-col grow-1"
                    :class="{ 'p-dialog-main--visible': mainPanelVisible, 'p-dialog-main--animating': isAnimatingSidebarToggle }"
                    :style="{ '--dialog-main-sidebar-offset': mainPanelSidebarOffset + 'px' }"
                >
                    <div class="p-dialog-header !py-0 !flex !items-center !h-12 !border-b border-(--border-muted)">
                        <Button
                            icon="pi pi-arrow-left"
                            severity="secondary"
                            variant="text"
                            class="p-dialog-mobile-only-button !p-0 !w-10 !h-10 !-ml-4"
                            :style="{ '--p-icon-size': '1.125rem' }"
                            :aria-label="t('userSettings.navBackButton')"
                            @click="mainPanelVisible = false"
                        />
                        <div class="p-dialog-title !text-base !font-normal">
                            {{ selectedMenuTitle }}
                        </div>
                        <div class="p-dialog-header-actions">
                            <Button
                                class="p-dialog-close-button"
                                size="small"
                                icon="pi pi-times"
                                severity="secondary"
                                variant="text"
                                rounded
                                :aria-label="t('dialog.close')"
                                @click="closeCallback"
                            />
                        </div>
                    </div>
                    <div class="p-dialog-content relative">
                        <EncryptionSettings v-if="selectedMenuItem.key === 'encryption'" />
                        <div v-if="hasPendingChanges" class="absolute left-0 bottom-0 right-0 p-4">
                            <div class="flex items-center justify-between mx-auto max-w-174 p-[0.625rem] pl-4 bg-(--background-surface-highest) border-1 border-(--border-subtle) rounded-(--radius-sm) shadow-(--legacy-elevation-high)">
                                <span class="font-medium">{{ t('userSettings.youHaveUnsavedChanges') }}</span>
                                <div class="flex items-center gap-4">
                                    <span class="link text-sm" tabindex="0" role="button">{{ t('userSettings.resetLink') }}</span>
                                    <Button
                                        severity="success"
                                        size="small"
                                        :label="t('userSettings.saveChangesButton')"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </Dialog>
    <Dialog
        v-model:visible="logoutConfirmVisible"
        :header="t('logout.confirm.title')"
        modal
        :style="{
            width: '100%',
            maxWidth: '400px',
        }"
    >
        <p class="text-(--text-muted) pb-2">{{ t('logout.confirm.content') }}</p>
        <template #footer>
            <Button :label="t('logout.confirm.cancelButton')" class="grow-1" severity="secondary" @click="logoutConfirmVisible = false" autofocus />
            <Button :label="t('logout.confirm.logOutButton')" class="grow-1" severity="danger" @click="confirmLogout" autofocus />
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { useLogout } from '@/composables/logout'
import { useProfileStore } from '@/stores/profile'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
const EncryptionSettings = defineAsyncComponent(() => import('./UserSettings/Encryption.vue'))

import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import ScrollPanel from 'primevue/scrollpanel'
import type { MenuItem, MenuItemCommandEvent } from 'primevue/menuitem'

const { t } = useI18n()
const { logout } = useLogout()
const { authenticatedUserAvatarUrl, authenticatedUserDisplayName } = storeToRefs(useProfileStore())

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
})

watch(() => props.visible, (visible, wasVisible) => {
    if (visible && !wasVisible) {
        mainPanelVisible.value = false
        mainPanelSidebarOffset.value = 0
    }
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
}>()

const mainPanelVisible = ref<boolean>(false)
watch(() => mainPanelVisible.value, () => {
    isAnimatingSidebarToggle.value = true
    setTimeout(() => {
        isAnimatingSidebarToggle.value = false
        mainPanelSidebarOffset.value = 0
    }, 300)
})

const mainPanelSidebarOffset = ref<number>(0)
const isAnimatingSidebarToggle = ref<boolean>(false)

const menuItems = ref([
    {
        label: t('userSettings.menu.userSettings'),
        items: [
            {
                key: 'myAccount',
                label: t('userSettings.menu.myAccount'),
                icon: 'pi pi-user',
                command: selectMenuItem,
            },
            {
                key: 'contentSocial',
                label: t('userSettings.menu.contentSocial'),
                icon: 'pi pi-shield',
                command: selectMenuItem,
            },
            {
                key: 'dataPrivacy',
                label: t('userSettings.menu.dataPrivacy'),
                icon: 'pi pi-lock',
                command: selectMenuItem,
            },
            {
                key: 'encryption',
                label: t('userSettings.menu.encryption'),
                icon: 'pi pi-key',
                command: selectMenuItem,
            },
            {
                key: 'authorizedApps',
                label: t('userSettings.menu.authorizedApps'),
                icon: 'pi pi-verified',
                command: selectMenuItem,
            },
            {
                key: 'devices',
                label: t('userSettings.menu.devices'),
                icon: 'pi pi-desktop',
                command: selectMenuItem,
            },
            {
                key: 'connections',
                label: t('userSettings.menu.connections'),
                icon: 'pi pi-link',
                command: selectMenuItem,
            },
            {
                key: 'notifications',
                label: t('userSettings.menu.notifications'),
                icon: 'pi pi-bell',
                command: selectMenuItem,
            },
        ],
    },
    {
        label: t('userSettings.menu.appSettings'),
        items: [
            {
                key: 'appearance',
                label: t('userSettings.menu.appearance'),
                icon: 'pi pi-palette',
                command: selectMenuItem,
            },
            {
                key: 'accessibility',
                label: t('userSettings.menu.accessibility'),
                icon: 'pi pi-star',
                command: selectMenuItem,
            },
            {
                key: 'voiceVideo',
                label: t('userSettings.menu.voiceVideo'),
                icon: 'pi pi-microphone',
                command: selectMenuItem,
            },
            {
                key: 'chat',
                label: t('userSettings.menu.chat'),
                icon: 'pi pi-comment',
                command: selectMenuItem,
            },
            {
                key: 'keybinds',
                label: t('userSettings.menu.keybinds'),
                icon: 'pi pi-search',
                command: selectMenuItem,
            },
            {
                key: 'languageTime',
                label: t('userSettings.menu.languageTime'),
                icon: 'pi pi-language',
                command: selectMenuItem,
            },
            {
                key: 'streamerMode',
                label: t('userSettings.menu.streamerMode'),
                icon: 'pi pi-video',
                command: selectMenuItem,
            },
            {
                key: 'advanced',
                label: t('userSettings.menu.advanced'),
                icon: 'pi pi-eye-slash',
                command: selectMenuItem,
            },
        ],
    },
    {
        label: t('userSettings.menu.activitySettings'),
        items: [
            {
                key: 'activityPrivacy',
                label: t('userSettings.menu.activityPrivacy'),
                icon: 'pi pi-search',
                command: selectMenuItem,
            },
        ],
    },
])

function selectMenuItem(event: MenuItemCommandEvent) {
    selectedMenuItem.value = event.item
    mainPanelSidebarOffset.value = 0
    mainPanelVisible.value = true
}

const selectedMenuItem = ref<MenuItem>(menuItems.value[0]!.items[0]!)
const selectedMenuTitle = computed<string>(() => {
    return selectedMenuItem.value?.label + ''
})

const hasPendingChanges = ref<boolean>(false)

const logoutConfirmVisible = ref<boolean>(false)

function onUpdateVisible(visible: boolean) {
    emit('update:visible', visible)
}

function confirmLogout() {
    logoutConfirmVisible.value = false
    emit('update:visible', false)
    logout()
}

let primaryPointerDown: {
    pageX: number;
    pageY: number;
    lastPageX: number;
    mainPanelSidebarOffset: number;
} | undefined = undefined
let isDraggingDrawer = ref<boolean | undefined>()
let averageXSpeed: number = 0
let averageXSpeedTimestamp: number = 0

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
            lastPageX: event.pageX,
            mainPanelSidebarOffset: mainPanelSidebarOffset.value,
        }
        averageXSpeed = 0
        averageXSpeedTimestamp = window.performance.now()
    }
}

function onPointerMoveMobileLayout(event: PointerEvent) {
    if (!primaryPointerDown || isDraggingDrawer.value === false) return
    if (
        !isDraggingDrawer.value
        && pointDistance(event.pageX, event.pageY, primaryPointerDown.pageX, primaryPointerDown.pageY) > 8
        && Math.abs(event.pageX - primaryPointerDown.pageX) > Math.abs(event.pageY - primaryPointerDown.pageY)
        && (
            (mainPanelSidebarOffset.value === 0 && event.pageX > primaryPointerDown.pageX)
        )
    ) {
        isDraggingDrawer.value = true
    }
    if (isDraggingDrawer.value) {
        event.preventDefault()
        event.stopPropagation()
        mainPanelSidebarOffset.value = Math.max(0, Math.min(window.innerWidth, primaryPointerDown.mainPanelSidebarOffset + event.pageX - primaryPointerDown.pageX))
        let speedProportion = Math.min(1, (window.performance.now() - averageXSpeedTimestamp) / 100)
        averageXSpeed = ((event.pageX - primaryPointerDown.lastPageX) * speedProportion) + (averageXSpeed * (1 - speedProportion))
        averageXSpeedTimestamp = window.performance.now()
        primaryPointerDown.lastPageX = event.pageX
    }
}

function onPointerCancelMobileLayout(event: PointerEvent) {
    onPointerUpWindow(event)
}

function onPointerUpWindow(event: PointerEvent) {
    if (primaryPointerDown && isDraggingDrawer.value) {
        isAnimatingSidebarToggle.value = true

        const distanceDragged = Math.abs(event.pageX - primaryPointerDown.pageX)

        if (
            primaryPointerDown.mainPanelSidebarOffset === 0
            && distanceDragged >= 30
            && averageXSpeed > 4
        ) {
            mainPanelVisible.value = false
        } else if (mainPanelSidebarOffset.value > (window.innerWidth) / 2) {
            mainPanelVisible.value = false
        }
        mainPanelSidebarOffset.value = 0

        setTimeout(() => {
            isAnimatingSidebarToggle.value = false
        }, 300)
    }
    isDraggingDrawer.value = undefined
    primaryPointerDown = undefined
}

onMounted(() => {
    window.addEventListener('pointerup', onPointerUpWindow, true)
})

onUnmounted(() => {
    window.removeEventListener('pointerup', onPointerUpWindow, true)
})

</script>

<style lang="scss" scoped>
.p-dialog-mobile-only-button {
    display: none;
}
.p-dialog-close-button {
    width: 2rem !important;
    height: 2rem !important;
}
@media screen and (max-width: 800px) {
    .p-dialog-mobile-only-button {
        display: inline-flex;
    }
    .p-dialog-sidebar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        max-width: none;

        &:deep(.p-menu-item) {
            --p-menu-item-active-background: var(--p-menu-item-background);
        }
    }
    .p-dialog-main {
        background: var(--p-dialog-background);
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        max-width: none;
        z-index: 1;
        pointer-events: none;
        opacity: 0;
        transform: translateX(100%);
        touch-action: pan-y;

        &.p-dialog-main--visible {
            opacity: 1;
            pointer-events: all;
            transform: translateX(var(--dialog-main-sidebar-offset, 0));
        }

        &.p-dialog-main--animating {
            transition: transform 0.2s, opacity 0.2s;
        }
    }
    
}
</style>