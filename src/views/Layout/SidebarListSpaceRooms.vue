<template>
    <SidebarListHeader>
        <div class="flex justify-between gap-2 w-full">
            <Button
                severity="secondary"
                variant="text"
                class="font-semibold !py-0 !px-2 !h-8 !text-(--text-strong) !gap-1"
            >
                <span class="text-nowrap text-ellipsis overflow-hidden">{{ spaceName }}</span>
                <span class="pi pi-chevron-down !text-xs" aria-hidden="true" />
            </Button>
            <Button
                v-tooltip.bottom="{ value: isTouchEventsDetected ? undefined : t('layout.inviteToSpace') }"
                icon="pi pi-user-plus"
                severity="secondary"
                variant="text"
                class="!w-8 !h-8 !text-(--text-strong)"
                :style="{ '--p-icon-size': '1.125rem' }"
            />
        </div>
    </SidebarListHeader>
    <SidebarListBody>
        <div class="p-2">
            <div
                class="p-menu !min-w-auto mt-1"
                :style="{
                    '--p-menu-item-focus-background': 'var(--background-mod-subtle)',
                }"
            >
                <div class="p-menu-list" role="navigation">
                    <div class="p-menu-item-content">
                        <div
                            role="button"
                            class="p-menu-item-link"
                            :class="{ 'p-menu-item-link-active': currentTopLevelSpaceId === route.params.roomId }"
                            @pointerdown="(event) => onPointerDownRoom(event, browseRoomsItem)"
                            @pointerup="(event) => onPointerUpRoom(event, browseRoomsItem)"
                        >
                            <span class="p-menu-item-icon pi pi-list" aria-hidden="true" />
                            <span class="p-menu-item-label flex gap-3 max-w-full">
                                {{ browseRoomsItem.label }}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="my-3 mx-2 border-t border-(--border-subtle)" />
            </div>
        </div>
        <div class="hidden"><Menu /></div> <!-- Inject menu styles, hacky. -->
    </SidebarListBody>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { useApplication } from '@/composables/application'
import { useSpaceStore } from '@/stores/space'

import SidebarListBody from './SidebarListBody.vue'
import SidebarListHeader from './SidebarListHeader.vue'

import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { type MenuItem } from 'primevue/menuitem'
import vTooltip from 'primevue/tooltip'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { isTouchEventsDetected, toggleApplicationSidebar } = useApplication()
const { currentTopLevelSpaceId, currentTopLevelSpaceName } = storeToRefs(useSpaceStore())

const spaceName = computed(() => {
    return currentTopLevelSpaceName.value ?? t('layout.unnamedSpace')
})

const browseRoomsItem: MenuItem = {
    key: currentTopLevelSpaceId.value,
    label: t('layout.browseRooms'),
    icon: 'pi pi-user',
}

let pointerDownRoomItem: MenuItem | undefined = undefined
let pointerDownRoomItemX: number = 0
let pointerDownRoomItemY: number = 0
let pointerDownRoomTimestamp: number = 0

function onPointerDownRoom(event: PointerEvent, item: MenuItem) {
    pointerDownRoomItem = item
    pointerDownRoomItemX = event.pageX
    pointerDownRoomItemY = event.pageY
    pointerDownRoomTimestamp = window.performance.now()
}

function onPointerUpRoom(event: PointerEvent, item: MenuItem) {
    // "Click" / "Tap" simulation. Need to do this because of the Safari "double tap with hover states" issue.
    if (
        item === pointerDownRoomItem
        && window.performance.now() - pointerDownRoomTimestamp <= 500
        && Math.abs(event.pageX - pointerDownRoomItemX) < 8
        && Math.abs(event.pageY - pointerDownRoomItemY) < 8
    ) {
        selectRoom(item)
    }
}

function selectRoom(item: MenuItem) {
    router.push({ name: 'room', params: { roomId: item.key } }).then(() => {
        toggleApplicationSidebar(false)
    })
}

</script>
