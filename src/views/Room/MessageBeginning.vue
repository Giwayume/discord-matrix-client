<template>
    <div class="p-4">
        <template v-if="isInsideSpace">
            <div class="w-20 h-20">
                <AuthenticatedImage :mxcUri="props.roomAvatarUrl" type="thumbnail" :width="48" :height="48" method="crop">
                    <template v-slot="{ src }">
                        <Avatar :image="src" shape="circle" class="p-avatar-full" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                    <template #error>
                        <Avatar icon="pi pi-hashtag" shape="circle" class="p-avatar-full" :style="{ '--p-avatar-icon-size': '3rem', '--p-avatar-background': 'var(--background-base-low)' }" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                </AuthenticatedImage>
            </div>
            <h3 class="font-bold text-[2rem] text-(--text-strong) leading-10 my-2">
                {{ t('room.spaceMessageHistoryBeginningTitle', { roomName: props.roomName ?? t('room.untitledRoom') }) }}
            </h3>
            <p>
                {{ t('room.spaceMessageHistoryBeginningSubtitle', { roomName: props.roomName ?? t('room.untitledRoom') }) }}
            </p>
            <div class="flex gap-2 mt-4">
                <Button size="small" severity="secondary">
                    <span class="pi pi-pencil" aria-hidden="true" :style="{ '--p-icon-size': '0.875rem' }"/>
                    {{ t('room.editRoom') }}
                </Button>
            </div>
        </template>
        <template v-else-if="otherMembers.length === 1">
            <div class="w-20 h-20">
                <AuthenticatedImage :mxcUri="otherMembers[0]!.avatarUrl" type="thumbnail" :width="48" :height="48" method="crop">
                    <template v-slot="{ src }">
                        <Avatar :image="src" shape="circle" class="p-avatar-full" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                    <template #error>
                        <Avatar icon="pi pi-user" shape="circle" class="p-avatar-full" :style="{ '--p-avatar-icon-size': '3rem', '--p-avatar-background': 'var(--background-base-low)' }" :aria-label="t('layout.userAvatarImage')" />
                    </template>
                </AuthenticatedImage>
            </div>
            <h3 v-if="otherMembers[0]?.displayname" class="font-bold text-[2rem] text-(--text-strong) leading-10 my-2">
                {{ otherMembers[0]!.displayname }}
            </h3>
            <h3 class="font-medium text-2xl text-(--text-strong) leading-[1.25] mb-5">{{ otherMembers[0]!.userId }}</h3>
            <I18nT tag="p" keypath="room.directMessageHistoryBeginning">
                <template #displayname>
                    <strong>{{ otherMembers[0]!.displayname ?? otherMembers[0]!.userId }}</strong>
                </template>
            </I18nT>
            <div class="flex gap-2 mt-4">
                <Button size="small" severity="secondary">{{ t('room.removeFriendButton') }}</Button>
                <Button size="small" severity="secondary">{{ t('room.blockButton') }}</Button>
            </div>
        </template>
        <template v-else-if="otherMembers.length > 1">
            <div
                v-tooltip.bottom="{ value: t('room.editGroupIconButton') }"
                class="message-beginning__edit-group-icon-button w-20 h-20"
                role="button"
                tabindex="0"
                :aria-label="t('room.editGroupIconButton')"
                @click="editGroupIconDialogVisible = true"
            >
                <AuthenticatedImage :mxcUri="props.roomAvatarUrl" type="thumbnail" :width="96" :height="96" method="crop">
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
                <template v-if="props.roomName">{{ props.roomName }}</template>
                <template v-else>
                    <template v-for="(otherMember, otherMemberIndex) of otherMembers">
                        {{ otherMember.displayname ?? otherMember.userId }}<template v-if="otherMemberIndex < otherMembers.length - 1">, </template>
                    </template>
                </template>
            </h3>
            <I18nT tag="p" keypath="room.groupMessageHistoryBeginning">
                <template #users>
                    <strong>
                        <template v-if="props.roomName">{{ props.roomName }}</template>
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
            <EditGroup v-model:visible="editGroupDialogVisible" :roomId="props.roomId" />
            <EditGroupIcon v-model:visible="editGroupIconDialogVisible" :roomId="props.roomId" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
const EditGroup = defineAsyncComponent(() => import('@/views/Room/EditGroup.vue'))
const EditGroupIcon = defineAsyncComponent(() => import('@/views/Room/EditGroupIcon.vue'))

import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import vTooltip from 'primevue/tooltip'

const { t } = useI18n()

const props = defineProps({
    otherMembers: {
        type: Array as PropType<Array<{ userId: string, avatarUrl?: string, displayname?: string | null }>>,
        required: true,
    },
    roomId: {
        type: String,
        required: true,
    },
    roomAvatarUrl: {
        type: String,
        default: undefined,
    },
    roomName: {
        type: String,
        default: undefined,
    },
    isInsideSpace: {
        type: Boolean,
        default: false,
    }
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