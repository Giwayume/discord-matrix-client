<template>
    <Application
        key="mainApplication"
        :title="isInsideSpace ? currentTopLevelSpaceName : t('home.directMessages')"
        titleIcon="pi pi-comments"
        :titleAvatar="currentTopLevelSpaceAvatarUrl"
    >
        <template #sidebar-list>
            <SidebarListSpaceRooms v-if="isInsideSpace" />
            <SidebarListDirectMessages v-else />
        </template>
        <JoinedRoomView v-if="roomInfo.type === 'joined'" :room="roomInfo.room" />
    </Application>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { isRoomPartOfSpace } from '@/utils/room'
import { useRoomStore } from '@/stores/room'
import { useSpaceStore } from '@/stores/space'

import Application from './Layout/Application.vue'
import JoinedRoomView from './Room/JoinedRoom.vue'
import SidebarListDirectMessages from './Layout/SidebarListDirectMessages.vue'
import SidebarListSpaceRooms from './Layout/SidebarListSpaceRooms.vue'

import {
    type InvitedRoom,
    type KnockedRoom,
    type JoinedRoom,
    type LeftRoom,
} from '@/types'

const { t } = useI18n()
const roomStore = useRoomStore()
const { invited: invitedRooms, knocked: knockedRooms, joined: joinedRooms, left: leftRooms } = storeToRefs(roomStore)
const { currentTopLevelSpaceName, currentTopLevelSpaceAvatarUrl } = storeToRefs(useSpaceStore())

const props = defineProps({
    roomId: {
        type: String,
        required: true,
    }
})

interface InvitedRoomInfo {
    type: 'invited';
    room: InvitedRoom;
}
interface KnockedRoomInfo {
    type: 'knocked';
    room: KnockedRoom;
}
interface JoinedRoomInfo {
    type: 'joined';
    room: JoinedRoom;
}
interface LeftRoomInfo {
    type: 'left';
    room: LeftRoom;
}
interface UnknownRoomInfo {
    type: 'unknown';
}
type RoomInfo = InvitedRoomInfo | KnockedRoomInfo | JoinedRoomInfo | LeftRoomInfo | UnknownRoomInfo

const roomInfo = computed<RoomInfo>(() => {
    if (invitedRooms.value[props.roomId]) {
        return {
            type: 'invited',
            room: invitedRooms.value[props.roomId]!,
        }
    } else if (knockedRooms.value[props.roomId]) {
        return {
            type: 'knocked',
            room: knockedRooms.value[props.roomId]!,
        }
    } else if (joinedRooms.value[props.roomId]) {
        return {
            type: 'joined',
            room: joinedRooms.value[props.roomId]!,
        }
    } else if (leftRooms.value[props.roomId]) {
        return {
            type: 'left',
            room: leftRooms.value[props.roomId]!,
        }
    }
    return { type: 'unknown' }
})

const isInsideSpace = computed<boolean>(() => {
    if (roomInfo.value.type !== 'unknown') {
        return isRoomPartOfSpace(roomInfo.value.room)
    }
    return false
})

</script>