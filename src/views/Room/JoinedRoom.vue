<template>
    <MainHeader>
        <div class="flex pl-4 py-2 pr-2 items-center">
            <template v-if="isInsideSpace">
                <span class="pi pi-hashtag w-8 text-center text-(--channel-icon)" />
            </template>
            <template v-else-if="otherMembersDisplayed.length === 1">
                <OverlayStatus level="low" :status="otherMembersDisplayed[0]!.presence" size="small" class="w-5 h-5 mr-2">
                    <AuthenticatedImage :mxcUri="otherMembersDisplayed[0]!.avatarUrl" type="thumbnail" :width="48" :height="48" method="crop">
                        <template v-slot="{ src }">
                            <Avatar :image="src" shape="circle" class="p-avatar-full" :aria-label="t('layout.userAvatarImage')" />
                        </template>
                        <template #error>
                            <Avatar icon="pi pi-user" shape="circle" class="p-avatar-full" :aria-label="t('layout.userAvatarImage')" />
                        </template>
                    </AuthenticatedImage>
                </OverlayStatus>
            </template>
            <template v-else-if="otherMembersDisplayed.length > 1">
                <AvatarGroup class="mr-2">
                    <template v-for="member of otherMembersDisplayed" :key="member.userId">
                        <AuthenticatedImage :mxcUri="member.avatarUrl" type="thumbnail" :width="48" :height="48" method="crop">
                            <template v-slot="{ src }">
                                <Avatar :image="src" shape="circle" class="p-avatar-full" :aria-label="t('layout.userAvatarImage')" />
                            </template>
                            <template #error>
                                <Avatar icon="pi pi-user" shape="circle" class="p-avatar-full" :aria-label="t('layout.userAvatarImage')" />
                            </template>
                        </AuthenticatedImage>
                    </template>
                </AvatarGroup>
            </template>
            <h1 class="font-medium text-(--text-strong) mr-2">
                <template v-if="roomName">{{ roomName }}</template>
                <template v-else>
                    <template v-for="(member, memberIndex) of otherMembers" :key="member.userId">
                        {{ member.displayname ?? member.userId }}<template v-if="memberIndex < otherMembers.length - 1">, </template>
                    </template>
                </template>
            </h1>
        </div>
    </MainHeader>
    <MainBody>
        <MessageBeginning
            :roomId="props.room.roomId"
            :otherMembers="otherMembersDisplayed"
            :roomAvatarUrl="roomAvatarUrl"
            :roomName="roomName"
        />
    </MainBody>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { useProfileStore } from '@/stores/profile'
import { useSessionStore } from '@/stores/session'

import { isRoomPartOfSpace } from '@/utils/room'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
import MainBody from '@/views/Layout/MainBody.vue'
import MainHeader from '@/views/Layout/MainHeader.vue'
import MessageBeginning from '@/views/Room/MessageBeginning.vue'
import OverlayStatus from '@/views/Common/OverlayStatus.vue'

import Avatar from 'primevue/avatar'
import AvatarGroup from 'primevue/avatargroup'

import {
    type JoinedRoom,
} from '@/types'

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

const isInsideSpace = computed<boolean>(() => {
    return isRoomPartOfSpace(props.room)
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

</script>