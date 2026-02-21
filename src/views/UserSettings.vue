<template>
    <Dialog
        :visible="visible"
        modal
        :draggable="false"
        :header="selectedMenuTitle"
        :style="{
            width: '100%',
            maxWidth: 'calc(100vw - 5rem)',
            height: 'calc(100vh - 4rem)',
            maxHeight: 'none',
        }"
        class="p-dialog-lg-fullwidth !p-0 !overflow-hidden"
        @update:visible="onUpdateVisible"
    >
        <template #container="{ closeCallback }">
            <div class="flex flex-row w-full h-full">
                <aside class="p-dialog-sidebar flex flex-col">
                    <div class="pl-1 pr-4">
                        <Button variant="text" severity="secondary" class="!p-2 mb-2 w-full !justify-start">
                            <AuthenticatedImage :mxcUri="authenticatedUserAvatarUrl" type="thumbnail" :width="48" :height="48" method="crop">
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
                <div class="flex flex-col grow-1">
                    <div class="p-dialog-header !py-0 !flex !items-center !h-12 !border-b border-(--border-muted)">
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
                    <div class="p-dialog-content">

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
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { useLogout } from '@/composables/logout'
import { useProfileStore } from '@/stores/profile'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'

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
const { logout } = useLogout();
const { authenticatedUserAvatarUrl, authenticatedUserDisplayName } = storeToRefs(useProfileStore())

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
}>()

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
}

const selectedMenuItem = ref<MenuItem>(menuItems.value[0]!.items[0]!)
const selectedMenuTitle = computed<string>(() => {
    return selectedMenuItem.value?.label + ''
})

const logoutConfirmVisible = ref<boolean>(false)

function onUpdateVisible(visible: boolean) {
    emit('update:visible', visible)
}

function confirmLogout() {
    logoutConfirmVisible.value = false
    emit('update:visible', false)
    logout()
}

</script>
