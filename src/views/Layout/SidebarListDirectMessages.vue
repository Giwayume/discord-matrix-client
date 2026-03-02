<template>
    <SidebarListHeader>
        <Button severity="secondary" size="small" class="text-nowrap w-full">{{ t('home.findStartConversationButton') }}</Button>
    </SidebarListHeader>
    <SidebarListBody>
        <div class="py-3 px-2 overflow-hidden">
            <Menu
                :model="topMenuItems"
                :style="{
                    '--p-menu-item-focus-background': 'var(--background-mod-subtle)',
                    '--p-menu-item-active-background': 'var(--background-mod-subtle)',
                    '--p-menu-item-border-radius': '0.5rem 0 0 0.5rem',
                }"
                class="-mr-2"
            >
                <template #item="{ item, props }">
                    <a
                        class="p-menu-item-link"
                        :class="{ 'p-menu-item-link-active': item.key === selectedMenuItem?.key }"
                        tabindex="-1"
                    >
                        <span class="p-menu-item-icon mx-1" :class="item.icon" />
                        <span class="p-menu-item-label">{{ item.label }}</span>
                    </a>
                </template>
            </Menu>
            <div class="-mr-2">
                <div class="my-3 border-t border-(--border-subtle)" />
            </div>
            <div class="flex justify-between pl-2 pb-1">
                <h2 class="text-sm text-(--channels-default)">{{ t('home.directMessages') }}</h2>
                <Button
                    v-tooltip.top="{ value: isTouchEventsDetected ? undefined : t('home.createMessage') }"
                    icon="pi pi-plus"
                    severity="secondary"
                    variant="text"
                    size="small"
                    class="!p-0 !w-8 !h-8 -my-2 -mr-2 shrink-0"
                    :style="{ '--p-button-sm-font-size': 'var(--text-xs)' }"
                    :aria-label="t('home.createMessage')"
                />
            </div>
            <div
                :style="{
                    '--p-menu-item-focus-background': 'var(--background-mod-subtle)',
                    '--p-menu-item-border-radius': '0.5rem 0 0 0.5rem',
                }"
                class="p-menu -mr-2 !min-w-auto"
            >
                <div class="p-menu-list" role="navigation">
                    <div v-for="item of directChatItems" class="p-menu-item" role="presentation">
                        <div class="p-menu-item-content">
                            <div
                                role="button"
                                class="p-menu-item-link sidebar-list__direct-message"
                                :class="{ 'p-menu-item-link-active': item.key === route.params.roomId }"
                                @pointerdown="(event) => onPointerDownChat(event, item)"
                                @pointerup="(event) => onPointerUpChat(event, item)"
                            >
                                <span class="p-menu-item-label flex gap-3 max-w-full">
                                    <OverlayStatus level="lowest" :status="item.presence" :invisible="item.isGroup" class="w-8 h-8">
                                        <AuthenticatedImage :mxcUri="item.avatarUrl" type="thumbnail" :width="48" :height="48" method="scale">
                                            <template v-slot="{ src }">
                                                <Avatar :image="src" shape="circle" size="large" :aria-label="t('layout.userAvatarImage')" />
                                            </template>
                                            <template #error>
                                                <Avatar :icon="item.isGroup ? 'pi pi-users' : 'pi pi-user'" shape="circle" size="large" :aria-label="t('layout.userAvatarImage')" />
                                            </template>
                                        </AuthenticatedImage>
                                    </OverlayStatus>
                                    <div class="flex flex-col justify-center overflow-hidden">
                                        <div class="overflow-hidden text-nowrap text-ellipsis leading-5 -mb-[2px]">{{ item.displayname ?? item.label }}</div>
                                        <div
                                            v-if="item.statusMessage"
                                            v-tooltip.top="{ value: isTouchEventsDetected ? undefined : item.statusMessage }"
                                            class="overflow-hidden text-nowrap text-ellipsis text-xs leading-4 -mt-[2px]"
                                        >{{ item.statusMessage }}</div>
                                    </div>
                                    <div
                                        class="p-button p-component p-button-icon-only p-button-secondary p-button-text p-button-sm !absolute right-1 !p-0 !w-7 !h-6"
                                        variant="text"
                                        severity="secondary"
                                        size="small"
                                        :aria-label="t('home.leaveRoom')"
                                        @click="leaveRoom(item.key)"
                                    >
                                        <span class="pi pi-times !text-sm" aria-hidden="true" />
                                    </div>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </SidebarListBody>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { useApplication } from '@/composables/application'
import { useProfileStore } from '@/stores/profile'
import { useRoomStore } from '@/stores/room'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
import OverlayStatus from '@/views/Common/OverlayStatus.vue'
import SidebarListBody from './SidebarListBody.vue'
import SidebarListHeader from './SidebarListHeader.vue'

import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import vTooltip from 'primevue/tooltip'
import type { MenuItem } from 'primevue/menuitem'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { isTouchEventsDetected, toggleApplicationSidebar } = useApplication()
const { directMessageRooms } = storeToRefs(useRoomStore())
const { profiles } = storeToRefs(useProfileStore())

const selectedMenuItem = ref<MenuItem | null>(null)

const topMenuItems = ref([
    {
        key: 'friends',
        label: t('home.topMenu.friends'),
        icon: 'pi pi-user',
        command() {
            router.push({ name: 'home' }).then(() => {
                toggleApplicationSidebar(false)
            })
        },
    },
])

const directChatItems = computed<MenuItem[]>(() => {
    return directMessageRooms.value.map((room) => {
        const userId = room.heroes[0]
        const profile = profiles.value[userId ?? '']
        return {
            key: room.id,
            label: userId,
            isGroup: room.heroes.length > 1,
            displayname: room.heroes.map(
                (userId) => profiles.value[userId ?? '']?.displayname ?? userId
            ).filter((displayName) => !!displayName).join(', '),
            avatarUrl: room.heroes.length > 1 ? undefined : profile?.avatarUrl,
            presence: profile?.presence,
            statusMessage: room.heroes.length > 1 ? undefined : profile?.statusMessage,
        }
    })
})

function selectChat(item: MenuItem) {
    router.push({ name: 'room', params: { roomId: item.key } }).then(() => {
        toggleApplicationSidebar(false)
    })
}

let pointerDownChatItem: MenuItem | undefined = undefined
let pointerDownChatItemX: number = 0
let pointerDownChatItemY: number = 0
let pointerDownChatTimestamp: number = 0

function onPointerDownChat(event: PointerEvent, item: MenuItem) {
    pointerDownChatItem = item
    pointerDownChatItemX = event.pageX
    pointerDownChatItemY = event.pageY
    pointerDownChatTimestamp = window.performance.now()
}

function onPointerUpChat(event: PointerEvent, item: MenuItem) {
    // "Click" / "Tap" simulation. Need to do this because of the Safari "double tap with hover states" issue.
    if (
        item === pointerDownChatItem
        && window.performance.now() - pointerDownChatTimestamp <= 500
        && Math.abs(event.pageX - pointerDownChatItemX) < 8
        && Math.abs(event.pageY - pointerDownChatItemY) < 8
    ) {
        selectChat(item)
    }
}

function highlightMenuItem() {
    if (route.name === 'home') {
        selectedMenuItem.value = topMenuItems.value.find((item) => item.key === 'friends') ?? null
    } else {
        selectedMenuItem.value = null
    }
}

function leaveRoom(roomId?: string) {
    if (!roomId) return
    // TODO - leave room
}

onMounted(() => {
    highlightMenuItem()
})

</script>

<style lang="scss" scoped>
.sidebar-list__direct-message {
    padding-block: 0.3125rem;
}
.p-menu-item-link {
    .p-button {
        visibility: hidden !important;
    }

    &:hover .p-button {
        visibility: visible !important;
    }
}
</style>