<template>
    <div class="p-4 overflow-hidden">
        <template v-if="isInsideSpace">
            <div class="w-20 h-20">
                <AuthenticatedImage :mxcUri="roomAvatarUrl" type="thumbnail" :width="48" :height="48" method="scale">
                    <template v-slot="{ src }">
                        <Avatar :image="src" shape="circle" class="p-avatar-full" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                    <template #error>
                        <Avatar icon="pi pi-hashtag" shape="circle" class="p-avatar-full" :style="{ '--p-avatar-icon-size': '3rem', '--p-avatar-background': 'var(--background-base-low)' }" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                </AuthenticatedImage>
            </div>
            <h3 class="font-bold text-[2rem] text-(--text-strong) leading-10 my-2">
                {{ t('room.spaceMessageHistoryBeginningTitle', { roomName: roomName ?? t('room.untitledRoom') }) }}
            </h3>
            <p>
                {{ t('room.spaceMessageHistoryBeginningSubtitle', { roomName: roomName ?? t('room.untitledRoom') }) }}
            </p>
            <div class="flex gap-2 mt-4">
                <Button size="small" severity="secondary">
                    <span class="pi pi-pencil" aria-hidden="true" :style="{ '--p-icon-size': '0.875rem' }"/>
                    {{ t('room.editRoom') }}
                </Button>
            </div>
        </template>
        <template v-else-if="otherMembersDisplayed.length === 1">
            <div class="w-20 h-20">
                <AuthenticatedImage :mxcUri="otherMembersDisplayed[0]!.avatarUrl" type="thumbnail" :width="48" :height="48" method="scale">
                    <template v-slot="{ src }">
                        <Avatar :image="src" shape="circle" class="p-avatar-full" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                    <template #error>
                        <Avatar icon="pi pi-user" shape="circle" class="p-avatar-full" :style="{ '--p-avatar-icon-size': '3rem', '--p-avatar-background': 'var(--background-base-low)' }" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                </AuthenticatedImage>
            </div>
            <h3 v-if="otherMembersDisplayed[0]?.displayname" class="font-bold text-[2rem] text-(--text-strong) leading-10 my-2">
                {{ otherMembersDisplayed[0]!.displayname }}
            </h3>
            <h3 class="font-medium text-2xl text-(--text-strong) leading-[1.25] mb-5">{{ otherMembersDisplayed[0]!.userId }}</h3>
            <I18nT tag="p" keypath="room.directMessageHistoryBeginning" scope="global">
                <template #displayname>
                    <strong>{{ otherMembersDisplayed[0]!.displayname ?? otherMembersDisplayed[0]!.userId }}</strong>
                </template>
            </I18nT>
            <div class="flex gap-2 mt-4">
                <Button size="small" severity="secondary">{{ t('room.removeFriendButton') }}</Button>
                <Button size="small" severity="secondary">{{ t('room.blockButton') }}</Button>
            </div>
        </template>
        <template v-else-if="otherMembersDisplayed.length > 1">
            <div
                v-tooltip.bottom="{ value: t('room.editGroupIconButton') }"
                class="message-beginning__edit-group-icon-button w-20 h-20"
                role="button"
                tabindex="0"
                :aria-label="t('room.editGroupIconButton')"
                @click="editGroupIconDialogVisible = true"
            >
                <AuthenticatedImage :mxcUri="roomAvatarUrl" type="thumbnail" :width="96" :height="96" method="scale">
                    <template v-slot="{ src }">
                        <Avatar :image="src" shape="circle" class="p-avatar-full" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                    <template #error>
                        <Avatar icon="pi pi-users" shape="circle" class="p-avatar-full" :style="{ '--p-avatar-icon-size': '3rem', '--p-avatar-background': 'var(--background-base-low)' }" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                </AuthenticatedImage>
                <div class="message-beginning__edit-group-icon-button-overlay">
                    <span class="pi pi-pencil" aria-hidden="true" />
                </div>
            </div>
            <h3 class="font-bold text-[2rem] text-(--text-strong) leading-10 my-2">
                <template v-if="roomName">{{ roomName }}</template>
                <template v-else>
                    <template v-for="(otherMember, otherMemberIndex) of otherMembers">
                        {{ otherMember.displayname ?? otherMember.userId }}<template v-if="otherMemberIndex < otherMembers.length - 1">, </template>
                    </template>
                </template>
            </h3>
            <I18nT tag="p" keypath="room.groupMessageHistoryBeginning" scope="global">
                <template #users>
                    <strong>
                        <template v-if="roomName">{{ roomName }}</template>
                        <template v-else>
                            <template v-for="(otherMember, otherMemberIndex) of otherMembers">
                                {{ otherMember.displayname ?? otherMember.userId }}<template v-if="otherMemberIndex < otherMembers.length - 1">, </template>
                            </template>
                        </template>
                    </strong>
                </template>
            </I18nT>
            <div class="flex flex-wrap gap-2 mt-4">
                <Button severity="primary"><span class="pi pi-user-plus" aria-hidden="true" /> {{ t('room.inviteFriendsButton') }}</Button>
                <Button severity="secondary" @click="editGroupDialogVisible = true"><span class="pi pi-pencil" aria-hidden="true" /> {{ t('room.editGroupButton') }}</Button>
            </div>
            <EditGroup v-model:visible="editGroupDialogVisible" :roomId="props.room.roomId" />
            <EditGroupIcon v-model:visible="editGroupIconDialogVisible" :roomId="props.room.roomId" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { isRoomPartOfSpace } from '@/utils/room'

import { useProfileStore } from '@/stores/profile'
import { useSessionStore } from '@/stores/session'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
const EditGroup = defineAsyncComponent(() => import('@/views/Room/EditGroup.vue'))
const EditGroupIcon = defineAsyncComponent(() => import('@/views/Room/EditGroupIcon.vue'))

import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import vTooltip from 'primevue/tooltip'

import type { JoinedRoom } from '@/types'

const { t } = useI18n()
const { profiles } = storeToRefs(useProfileStore())
const { userId } = storeToRefs(useSessionStore())

const props = defineProps({
    room: {
        type: Object as PropType<JoinedRoom>,
        required: true,
    }
})

const roomAvatarUrl = computed<string | undefined>(() => {
    const roomAvatarEvent = props.room.stateEventsByType['m.room.avatar']?.[0]
    return roomAvatarEvent?.content.url
})

const roomName = computed<string | undefined>(() => {
    const roomNameEvent = props.room.stateEventsByType['m.room.name']?.[0]
    return roomNameEvent?.content.name
})

const otherMembers = computed(() => {
    return (props.room as JoinedRoom).stateEventsByType['m.room.member']?.filter((member) => {
        return (member.content.membership === 'join' || member.content.membership === 'invite') && member.stateKey && member.stateKey != userId.value
    }).map((member) => {
        const userId = member.stateKey!
        return {
            userId,
            avatarUrl: profiles.value[userId]?.avatarUrl ?? member.content.avatarUrl,
            displayname: profiles.value[userId]?.displayname ?? member.content.displayname,
            presence: profiles.value[userId]?.presence ?? 'offline',
        }
    }) ?? []
})
const otherMembersDisplayed = computed(() => {
    return otherMembers.value.slice(0, 5)
})

const isInsideSpace = computed<boolean>(() => {
    return isRoomPartOfSpace(props.room)
})

const editGroupDialogVisible = ref<boolean>(false)
const editGroupIconDialogVisible = ref<boolean>(false)

</script>

<style lang="scss" scoped>
.message-beginning__edit-group-icon-button {
    position: relative;
    cursor: pointer;

    &:hover {
        .p-avatar {
            opacity: 0.3;
        }
        .message-beginning__edit-group-icon-button-overlay {
            visibility: visible;
        }
    }
}
.message-beginning__edit-group-icon-button-overlay {
    visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}
</style>