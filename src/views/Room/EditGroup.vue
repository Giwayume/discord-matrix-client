<template>
    <Dialog
        :visible="visible"
        modal
        :header="t('editGroup.title')"
        :draggable="false"
        :style="{ width: '100%', maxWidth: '30rem' }"
        @update:visible="(visible) => emit('update:visible', visible)"
    >
        <Message v-if="!room" severity="error" variant="simple">
            {{ t('editGroup.groupNotFound') }}
        </Message>
        <template v-else>
            <div class="edit-group__edit-avatar-button mx-auto mt-2" tabindex="0" role="button" :aria-label="t('editGroup.editRoomAvatar')" @click="editGroupIcon">
                <AuthenticatedImage :mxcUri="roomAvatarUrl" type="thumbnail" :width="96" :height="96" method="crop">
                    <template v-slot="{ src }">
                        <Avatar :image="src" shape="circle" class="p-avatar-full" :aria-label="t('editGroup.roomAvatar')" />
                    </template>
                    <template #error>
                        <Avatar
                            icon="pi pi-users"
                            shape="circle"
                            class="p-avatar-full"
                            :style="{ '--p-avatar-icon-size': '3rem', '--p-avatar-background': 'var(--background-surface-highest)', '--p-avatar-color': 'var(--background-mod-normal)' }"
                            :aria-label="t('layout.userAvatarImage')"
                        />
                    </template>
                </AuthenticatedImage>
                <div class="flex items-center justify-center absolute -top-1 -right-1 w-10 h-10 bg-(--background-mod-subtle) rounded-full border-4 border-(--background-surface-high)">
                    <span class="pi pi-pencil" aria-hidden="true" />
                </div>
            </div>
            <div class="pt-6 pb-2">
                <InputText v-model="roomName" :placeholder="roomNamePlaceholder" :aria-label="t('editGroup.groupName')" class="w-full" />
            </div>
        </template>
        <template #footer>
            <template v-if="room">
                <Button severity="secondary" class="grow-1 basis-1" @click="emit('update:visible', false)">{{ t('editGroup.cancelButton') }}</Button>
                <Button severity="primary" class="grow-1 basis-1" @click="save">{{ t('editGroup.saveButton') }}</Button>
            </template>
        </template>
    </Dialog>
    <EditGroupIcon v-model:visible="editGroupIconVisible" :roomId="props.roomId"></EditGroupIcon>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { useProfileStore } from '@/stores/profile'
import { useRoomStore } from '@/stores/room'
import { useSessionStore } from '@/stores/session'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
import EditGroupIcon from '@/views/Room/EditGroupIcon.vue'

import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'

const { t } = useI18n()
const { profiles } = storeToRefs(useProfileStore())
const { joined: joinedRooms } = storeToRefs(useRoomStore())
const { userId: currentUserId } = storeToRefs(useSessionStore())

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    roomId: {
        type: String,
        required: true,
    }
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
}>()

const roomAvatarUrl = ref<string | undefined>()
const roomName = ref<string>('')

const room = computed(() => {
    return joinedRooms.value[props.roomId]
})

const roomNamePlaceholder = computed(() => {
    if (!room.value) return ''
    return (room.value.stateEventsByType['m.room.member']?.filter((member) => {
        return (member.content.membership === 'join' || member.content.membership === 'invite') && member.stateKey && member.stateKey != currentUserId.value
    }).map((member) => {
        return profiles.value[member.stateKey!]?.displayname ?? member.content.displayname ?? member.stateKey ?? ''
    }) ?? []).slice(0, 5).join(', ')
})

const editGroupIconVisible = ref<boolean>(false)

function editGroupIcon() {
    editGroupIconVisible.value = true
}

function save() {
    emit('update:visible', false)
}

</script>

<style lang="scss" scoped>
.edit-group__edit-avatar-button {
    position: relative;
    width: 7.5rem;
    height: 7.5rem;
    cursor: pointer;

    .pi {
        color: var(--text-muted);
    }

    &:hover {
        .pi {
            color: var(--text-strong);
        }

        .p-avatar {
            --p-avatar-background: var(--background-mod-normal) !important;
        }
    }
}
</style>
