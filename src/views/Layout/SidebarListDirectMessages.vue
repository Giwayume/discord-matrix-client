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
                <template #item="{ item }">
                    <a
                        class="p-menu-item-link"
                        :class="{ 'p-menu-item-link-active': item.key === selectedMenuItem?.key }"
                        tabindex="-1"
                    >
                        <span class="p-menu-item-icon mx-1" :class="item.icon" />
                        <span class="p-menu-item-label">{{ item.label }}</span>
                        <template v-if="item.key === 'messageRequests' && invitedDirectMessageRooms.length > 0">
                            <span class="bg-(--background-feedback-notification) text-xs font-bold text-white rounded-lg min-w-4 h-4 px-1 ml-auto mr-1 leading-4 text-center">
                                {{ messageRequestCount }}
                            </span>
                        </template>
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
                    class="!p-0 !w-8 !h-8 -my-2 -mr-1 shrink-0"
                    :style="{ '--p-button-sm-font-size': 'var(--text-xs)' }"
                    :aria-label="t('home.createMessage')"
                    @click="newMessageDialogVisible = true"
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
                    <template v-for="item of directChatItems" :key="item.key">
                        <div v-if="item.categoryHeader" class="flex justify-between pl-2 pb-1 mt-4">
                            <h2 class="text-sm text-(--channels-default)">{{ item.categoryHeader }}</h2>
                        </div>
                        <div
                            class="p-menu-item"
                            :class="{ 'p-menu-item--unread': false }"
                            role="presentation"
                        >
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
                                            v-if="item.canLeave"
                                            class="p-button p-component p-button-icon-only p-button-secondary p-button-text p-button-sm !absolute right-1 !p-0 !w-8 !h-8"
                                            variant="text"
                                            severity="secondary"
                                            size="small"
                                            :aria-label="t('home.leaveRoom')"
                                            data-leave-room
                                        >
                                            <span class="pi pi-times !text-sm" aria-hidden="true" />
                                        </div>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </SidebarListBody>
    <Dialog
        v-model:visible="leaveRoomDialogVisible"
        :header="t(leaveRoomIsGroup ? 'leaveGroupConfirmDialog.title' : 'leaveGroupConfirmDialog.duplicateChatTitle', { displayname: leaveRoomIsGroup ? leaveRoomMenuItem?.displayname : leaveRoomMenuItem?.heroes?.[0] })"
        modal
        :style="{ width: 'calc(100% - 1rem)', maxWidth: '30rem' }"
    >
        <div class="leave-room-dialog__content py-3" v-html="micromark(t(leaveRoomIsGroup ? 'leaveGroupConfirmDialog.subtitle' : 'leaveGroupConfirmDialog.duplicateChatSubtitle', { displayname: leaveRoomIsGroup ? leaveRoomMenuItem?.displayname : leaveRoomMenuItem?.heroes?.[0] }))"></div>
        <template #footer>
            <Button :label="t('leaveGroupConfirmDialog.cancelButton')" class="grow-1 basis-1" severity="secondary" @click="leaveRoomDialogVisible = false" autofocus />
            <Button :loading="isLeavingRoom" class="grow-1 basis-1" severity="danger" @click="leaveRoomConfirm(leaveRoomMenuItem?.key)">
                <div class="p-button-label">{{ t(leaveRoomIsGroup ? 'leaveGroupConfirmDialog.leaveGroupButton' : 'leaveGroupConfirmDialog.leaveRoomButton') }}</div>
                <div class="p-button-loading-dots" />
            </Button>
        </template>
    </Dialog>
    <NewMessagedialog v-model:visible="newMessageDialogVisible" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { micromark } from 'micromark'

import { useAccountData } from '@/composables/account-data'
import { useApplication } from '@/composables/application'
import { createLogger } from '@/composables/logger'
import { useRooms } from '@/composables/rooms'

import { useProfileStore } from '@/stores/profile'
import { useRoomStore } from '@/stores/room'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
const NewMessagedialog = defineAsyncComponent(() => import('@/views/Layout/NewMessageDialog.vue'))
import OverlayStatus from '@/views/Common/OverlayStatus.vue'
import SidebarListBody from './SidebarListBody.vue'
import SidebarListHeader from './SidebarListHeader.vue'

import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Menu from 'primevue/menu'
import vTooltip from 'primevue/tooltip'
import { useToast } from 'primevue/usetoast'
import type { MenuItem } from 'primevue/menuitem'

const log = createLogger(import.meta.url)

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const { toggleRoomVisibility } = useAccountData()
const { isTouchEventsDetected, toggleApplicationSidebar } = useApplication()
const { leaveRoom, forgetRoom } = useRooms()
const { joinedDirectMessageRooms, invitedDirectMessageRooms, serverNoticeRooms } = storeToRefs(useRoomStore())
const { profiles } = storeToRefs(useProfileStore())

const selectedMenuItem = ref<MenuItem | null>(null)

const topMenuItems = computed(() => {
    const items = [
        {
            key: 'friends',
            label: t('home.topMenu.friends'),
            icon: 'pi pi-user',
            command() {
                router.push({ name: 'home' }).then(() => {
                    toggleApplicationSidebar(false)
                })
            },
        }
    ]
    if (invitedDirectMessageRooms.value.length > 0) {
        items.push({
            key: 'messageRequests',
            label: t('home.topMenu.messageRequests'),
            icon: 'pi pi-envelope',
            command() {
                router.push({ name: 'message-requests' }).then(() => {
                    toggleApplicationSidebar(false)
                })
            },
        })
    }
    return items
})

const directChatItems = computed<MenuItem[]>(() => {
    const items: MenuItem[] = []
    for (const roomList of [joinedDirectMessageRooms.value, serverNoticeRooms.value]) {
        for (const [roomIndex, room] of roomList.entries()) {
            let categoryHeader = (roomIndex === 0 && roomList === serverNoticeRooms.value)
                ? t('home.systemAlerts')
                : undefined
            const userId = room.heroes[0]
            const profile = profiles.value[userId ?? '']
            items.push({
                categoryHeader,
                key: room.roomId,
                label: userId,
                isGroup: room.heroes.length > 1,
                isDirect: room.heroes.length === 1,
                heroes: room.heroes,
                displayname: room.name || room.heroes.map(
                    (userId) => profiles.value[userId ?? '']?.displayname ?? userId
                ).filter((displayName) => !!displayName).join(', '),
                avatarUrl: room.heroes.length > 1 ? undefined : profile?.avatarUrl,
                presence: profile?.presence,
                statusMessage: room.heroes.length > 1 ? undefined : profile?.statusMessage,
                canLeave: roomList === joinedDirectMessageRooms.value,
            })
        }
    }
    return items
})

const messageRequestCount = computed<string>(() => {
    return invitedDirectMessageRooms.value.length > 99 ? '99+' : invitedDirectMessageRooms.value.length + ''
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
        const leaveRoomButton = (event.target as HTMLElement)?.closest('[data-leave-room]')
        if (leaveRoomButton) {
            const duplicateChats = directChatItems.value.filter(
                (otherItem) => otherItem.isDirect && otherItem.heroes[0] === item.heroes[0] && otherItem.canLeave
            )
            if (!item.isDirect || duplicateChats.length > 1) {
                leaveRoomIsGroup.value = !item.isDirect
                leaveRoomMenuItem.value = item
                leaveRoomDialogVisible.value = true
            } else {
                toggleRoomVisibility(item.key!, false)
            }
        } else {
            selectChat(item)
        }
    }
}

function highlightMenuItem() {
    if (route.name === 'home') {
        selectedMenuItem.value = topMenuItems.value.find((item) => item.key === 'friends') ?? null
    } else if (route.name === 'message-requests') {
        selectedMenuItem.value = topMenuItems.value.find((item) => item.key === 'messageRequests') ?? null
    } else {
        selectedMenuItem.value = null
    }
}

const leaveRoomDialogVisible = ref<boolean>(false)
const leaveRoomMenuItem = ref<MenuItem>()
const leaveRoomIsGroup = ref<boolean>(false)
const isLeavingRoom = ref<boolean>(false)

async function leaveRoomConfirm(roomId?: string) {
    if (!roomId) return
    isLeavingRoom.value = true
    try {
        await leaveRoom(roomId)
        await forgetRoom(roomId)
        router.push({ name: 'home' })
    } catch (error) {
        log.error('An error occurred when trying to leave a room.', error)
        toast.add({ severity: 'error', summary: t('home.errorLeaveRoomToast'), life: 5000 })
    } finally {
        isLeavingRoom.value = false
        leaveRoomDialogVisible.value = false
    }
}

const newMessageDialogVisible = ref<boolean>(false)

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
.p-menu-item.p-menu-item--unread {
    position: relative;

    &::before {
        content: '';
        background-color: var(--badge-notification-background);
        border-radius: 0 var(--radius-xs) var(--radius-xs) 0;
        height: 0.5rem;
        inset-inline-start: -0.5rem;
        margin-top: -0.25rem;
        position: absolute;
        top: 50%;
        width: 0.25rem;
    }
}
.leave-room-dialog__content :deep(p) {
    margin: 1rem 0;
    &:first-child {
        margin-top: 0;
    }
    &:last-child {
        margin-bottom: 0;
    }
}
</style>