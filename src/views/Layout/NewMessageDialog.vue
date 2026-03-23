<template>
    <Dialog
        :visible="visible"
        modal
        :header="t('newMessageDialog.title')"
        :style="{ width: 'calc(100% - 1rem)', maxWidth: '30rem', height: 'calc(100dvh - 6rem)', minHeight: '27rem' }"
        :pt="{
            content: { class: 'flex flex-col' },
            footer: { class: 'border-t border-(--border-subtle)' }
        }"
        @update:visible="(visible) => emit('update:visible', visible)"
    >
        <p :class="{ 'text-(--text-subtle)': remainingSelectionCount > 0, 'text-(--text-feedback-critical)': remainingSelectionCount === 0 }">{{ t('newMessageDialog.addCountLimit', { count: remainingSelectionCount }) }}</p>
        <div class="p-inputtext flex flex-wrap items-center w-full !px-1 !py-1 !gap-1 mt-6 mb-3">
            <Chip
                v-for="userId of selectedUserIds"
                :key="userId"
                :label="profiles[userId]?.displayname ?? userId"
                removable
                class="h-9"
                @remove="removeSelectedUser(userId)"
            >
                <template #removeicon="{ removeCallback, keydownCallback }">
                    <i class="p-chip-remove-icon pi pi-times ml-1" aria-hidden="true" @click="removeCallback" @keydown="keydownCallback" />
                </template>
            </Chip>
            <InputText
                v-model.trim="userSearchText"
                class="p-inputtext-transparent w-32 grow-1 !py-2"
                :placeholder="selectedUserIds.length === 0 ? t('newMessageDialog.searchPlaceholder') : ''"
                @keydown="onKeydownUserSearch"
                @input="onInputUserSearch"
            />
        </div>
        <ScrollPanel>
            <label
                v-for="(user, userIndex) of filteredContactList"
                :key="user.userId"
                class="user-checkbox-list__item"
                :class="{ 'user-checkbox-list__item--selected': userSearchSelectionIndex === userIndex }"
            >
                <OverlayStatus level="high" :status="user.presence" class="w-8 h-8">
                    <AuthenticatedImage :mxcUri="user.avatarUrl" type="thumbnail" :width="48" :height="48" method="scale">
                        <template v-slot="{ src }">
                            <Avatar :image="src" shape="circle" size="large" :aria-label="t('layout.userAvatarImage')" />
                        </template>
                        <template #error>
                            <Avatar icon="pi pi-user" shape="circle" size="large" :aria-label="t('layout.userAvatarImage')" />
                        </template>
                    </AuthenticatedImage>
                </OverlayStatus>
                <div class="flex flex-col grow-1">
                    <strong class="text-(--text-strong) text-medium">{{ user.displayname ?? user.userId }}</strong>
                    <span class="text-xs text-(--text-muted)">{{ user.userId }}</span>
                </div>
                <Checkbox
                    v-model="selectedUserIds"
                    :value="user.userId"
                    :disabled="!selectedUserIds.includes(user.userId) && remainingSelectionCount === 0"
                />
            </label>
            <div v-if="isSearchingForMoreUsers" class="mx-2 my-4 text-(--text-muted) text-sm text-center">
                {{ t('newMessageDialog.searchingDirectory') }}
            </div>
            <div
                v-else-if="filteredContactList.length === 0"
                v-html="micromark(t('newMessageDialog.noUsersFound', { defaultUserIdHomeserver }))"
                class="mx-10 my-4 text-(--text-muted) text-sm text-center" />
            <div
                v-else-if="userSearchText"
                v-html="micromark(t('newMessageDialog.someUsersFound', { defaultUserIdHomeserver }))"
                class="mx-10 mt-8 mb-4 text-(--text-muted) text-sm text-center" />
        </ScrollPanel>
        <template #footer>
            <div class="flex flex-col w-full">
                <div v-if="selectedUserIds.length > 1" class="flex w-full mb-8 gap-4 items-center">
                    <div class="edit-group__edit-avatar-button" tabindex="0" role="button" :aria-label="t('editGroup.editRoomAvatar')" @click="pickGroupIcon">
                        <Avatar v-if="groupAvatarObjectUrl" :image="groupAvatarObjectUrl" shape="circle" class="p-avatar-full" :aria-label="t('editGroup.roomAvatar')" />
                        <Avatar
                            v-else
                            icon="pi pi-users"
                            shape="circle"
                            class="p-avatar-full"
                            :style="{ '--p-avatar-icon-size': '3rem', '--p-avatar-background': 'var(--background-surface-highest)', '--p-avatar-color': 'var(--background-mod-normal)' }"
                            :aria-label="t('layout.userAvatarImage')"
                        />
                        <div class="flex items-center justify-center absolute -top-[0.25rem] -right-[0.25rem] w-8 h-8 bg-(--background-mod-subtle) rounded-full border-4 border-(--background-surface-high)">
                            <span class="pi pi-pencil !text-xs" aria-hidden="true" />
                        </div>
                    </div>
                    <div class="flex flex-col grow-1">
                        <label for="new-message-dialog-group-name-input" class="text-sm text-(--text-muted) mb-3">{{ t('newMessageDialog.groupNameLabel') }}</label>
                        <InputText v-model="groupName" :placeholder="defaultGroupName" id="new-message-dialog-group-name-input" class="w-full" />
                    </div>
                </div>
                <div class="flex w-full gap-2 pt-2">
                    <Button :label="t('newMessageDialog.cancelButton')" class="grow-1 basis-1" severity="secondary" @click="emit('update:visible', false)" autofocus />
                    <Button :loading="isCreatingRoom" class="grow-1 basis-1" severity="primary" @click="createRoomConfirm()">
                        <div class="p-button-label">{{ t(selectedUserIds.length > 1 ? 'newMessageDialog.createGroupMessageButton' : 'newMessageDialog.createMessageButton') }}</div>
                        <div class="p-button-loading-dots" />
                    </Button>
                </div>
            </div>
        </template>
    </Dialog>
    <EditGroupIcon v-model:visible="editGroupIconDialogVisible" @iconSelected="onGroupIconSelected" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { micromark } from 'micromark'

import { useAccountData } from '@/composables/account-data'
import { useApplication } from '@/composables/application'
import { useProfiles } from '@/composables/profiles'

import { useAccountDataStore } from '@/stores/account-data'
import { useProfileStore } from '@/stores/profile'
import { useRoomStore } from '@/stores/room'
import { useSessionStore } from '@/stores/session'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
const EditGroupIcon = defineAsyncComponent(() => import('@/views/Room/EditGroupIcon.vue'))
import OverlayStatus from '@/views/Common/OverlayStatus.vue'

import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Chip from 'primevue/chip'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import ScrollPanel from 'primevue/scrollpanel'

import { type UserProfile } from '@/types'

const { t } = useI18n()
const router = useRouter()

const { toggleRoomVisibility } = useAccountData()
const { toggleApplicationSidebar } = useApplication()
const { getProfile, searchUserDirectory } = useProfiles()

const { hiddenRooms } = storeToRefs(useAccountDataStore())
const { profiles } = storeToRefs(useProfileStore())
const { draft: draftRoom, invited: invitedRooms, joined: joinedRooms } = storeToRefs(useRoomStore())
const { userId: sessionUserId, defaultUserIdHomeserver } = storeToRefs(useSessionStore())

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
}>()

const userSearchText = ref<string>('')
const userSearchSelectionIndex = ref<number>(-1)
const selectedUserIds = ref<string[]>([])
const orderedContactList = ref<UserProfile[]>([])
const groupName = ref<string>('')
const groupAvatarBlob = ref<Blob | undefined>(undefined)
const groupAvatarObjectUrl = ref<string | undefined>(undefined)
const editGroupIconDialogVisible = ref<boolean>(false)

const isSearchingForMoreUsers = ref<boolean>(false)
const isCreatingRoom = ref<boolean>(false)

watch(() => groupAvatarBlob.value, (blob) => {
    if (groupAvatarObjectUrl.value) {
        URL.revokeObjectURL(groupAvatarObjectUrl.value)
    }
    if (blob) {
        groupAvatarObjectUrl.value = URL.createObjectURL(blob)
    } else {
        groupAvatarObjectUrl.value = undefined
    }
})

const remainingSelectionCount = computed(() => {
    return Math.max(0, 9 - selectedUserIds.value.length)
})

const filteredContactList = computed(() => {
    const preparedSearchTerms = userSearchText.value.toLowerCase().trim().split(/\s+/).map((searchTerm) => {
        return {
            searchTerm,
            searchTermIsFullId: searchTerm.includes(':'),
            usernameOnlyTerm: searchTerm.replace(/^@/, ''),
        }
    })
    return orderedContactList.value.filter((contact) => {
        let allSearchTermsFound = true
        for (const { searchTerm, searchTermIsFullId, usernameOnlyTerm } of preparedSearchTerms) {
            if (!(
                contact.displayname?.toLowerCase().includes(searchTerm)
                || (!searchTermIsFullId && contact.userId.split(':')[0]?.slice(1).includes(usernameOnlyTerm))
                || (searchTermIsFullId && contact.userId.includes(searchTerm))
            )) {
                allSearchTermsFound = false
                break
            }
        }
        return allSearchTermsFound
    })
})

const defaultGroupName = computed(() => {
    return selectedUserIds.value.map((userId) => profiles.value[userId]?.displayname ?? userId).join(', ')
})

function populateContactList() {
    const contacts: UserProfile[] = []
    for (const userId in profiles.value) {
        if (userId === sessionUserId.value) continue
        if (profiles.value[userId]) {
            contacts.push(profiles.value[userId])
        }
    }
    contacts.sort((a, b) => {
        if (a.currentlyActive && !b.currentlyActive) return -1
        else if (b.currentlyActive && !a.currentlyActive) return 1
        return 0
    })
    orderedContactList.value = contacts
}

function onKeydownUserSearch(event: KeyboardEvent) {
    if (event.key === 'Backspace') {
        if (userSearchText.value.trim() === '') {
            event.preventDefault()
            selectedUserIds.value.pop()
        }
    } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        userSearchSelectionIndex.value++
        if (userSearchSelectionIndex.value >= filteredContactList.value.length) {
            userSearchSelectionIndex.value = 0
        }
    } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        userSearchSelectionIndex.value--
        if (userSearchSelectionIndex.value < 0) {
            userSearchSelectionIndex.value =  filteredContactList.value.length - 1
        }
    } else if (event.key === 'Enter') {
        event.preventDefault()
        const person = filteredContactList.value[Math.max(0, Math.min(filteredContactList.value.length - 1, userSearchSelectionIndex.value))]!
        if (selectedUserIds.value.includes(person.userId)) {
            const userIdIndex = selectedUserIds.value.indexOf(person.userId)
            selectedUserIds.value.splice(userIdIndex, 1)
        } else {
            selectedUserIds.value.push(person.userId)
            currentlyRunningUserDirectorySearchTerm = ''
            userSearchText.value = ''
        }
    }
}

watch(() => userSearchText.value, (newText, oldText) => {
    if (newText !== oldText) {
        if (newText.trim() !== '') {
            userSearchSelectionIndex.value = 0
        } else {
            userSearchSelectionIndex.value = -1
        }
    }
})

watch(() => selectedUserIds.value, (newSelection, oldSelection) => {
    if (newSelection.length > oldSelection.length) {
        currentlyRunningUserDirectorySearchTerm = ''
        userSearchText.value = ''
    }
})

let currentlyRunningUserDirectorySearchTerm = ''
let userDirectorySearchTimeoutHandle: number | undefined = undefined
let userDirectorySearchAbortController: AbortController | undefined = undefined
async function runDirectorySearch() {
    userDirectorySearchAbortController?.abort()
    userDirectorySearchAbortController = new AbortController()

    try {
        const userSearchTrim = userSearchText.value.trim()
        const isExactUserSearch = userSearchTrim.includes(':')
        const userIdSearch = isExactUserSearch && !userSearchTrim.includes(' ')
            ? `@${userSearchTrim.replace(/^@/, '')}`
            : `@${userSearchTrim.replace(/^@/, '')}:${defaultUserIdHomeserver.value}`
        try {
            if (orderedContactList.value.findIndex((user) => user.userId === userIdSearch) === -1) {
                const profile = await getProfile(userIdSearch, userDirectorySearchAbortController)
                userDirectorySearchAbortController.abort()

                if (orderedContactList.value.findIndex((user) => user.userId === userIdSearch) === -1) {
                    orderedContactList.value.push({
                        userId: userIdSearch,
                        avatarUrl: profile.avatarUrl,
                        currentlyActive: false,
                        displayname: profile.displayname,
                        presence: 'offline',
                    })
                }
            }
            if (isExactUserSearch) {
                throw new DOMException('Aborting directory search because a profile was found.', 'AbortError')
            }
        } catch (error) {
            // Profile not found - ignore.
        }

        if (userDirectorySearchAbortController.signal.aborted) {
            throw new DOMException('Not starting directory search because signal was aborted.', 'AbortError')
        }
        const results = await searchUserDirectory(userSearchTrim, userDirectorySearchAbortController)
        for (const result of results.results) {
            if (orderedContactList.value.findIndex((user) => user.userId === result.userId) !== -1) continue
            orderedContactList.value.push({
                userId: result.userId,
                avatarUrl: result.avatarUrl,
                currentlyActive: false,
                displayname: result.displayName,
                presence: 'offline',
            })
        }
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            // Ignore aborted request.
        }
    } finally {
        isSearchingForMoreUsers.value = false
    }
}

function onInputUserSearch() {
    if (userSearchText.value === '') {
        currentlyRunningUserDirectorySearchTerm = ''
        isSearchingForMoreUsers.value = false
        clearTimeout(userDirectorySearchTimeoutHandle)
        userDirectorySearchAbortController?.abort()
    } else if (currentlyRunningUserDirectorySearchTerm !== userSearchText.value) {
        currentlyRunningUserDirectorySearchTerm = userSearchText.value
        isSearchingForMoreUsers.value = true
        clearTimeout(userDirectorySearchTimeoutHandle)
        userDirectorySearchAbortController?.abort()
        userDirectorySearchTimeoutHandle = setTimeout(() => {
            runDirectorySearch()
        }, 1500)
    }
}

function removeSelectedUser(userId: string) {
    const selectedUserIndex = selectedUserIds.value.indexOf(userId)
    if (selectedUserIndex > -1) {
        selectedUserIds.value.splice(selectedUserIndex, 1)
    }
}

function pickGroupIcon() {
    editGroupIconDialogVisible.value = true
}

function onGroupIconSelected(imageBlob: Blob) {
    groupAvatarBlob.value = imageBlob
}

function createRoomConfirm() {
    const selectedUserIdSet = new Set<string>(selectedUserIds.value)

    // See if there is an existing joined room and navigate to it.
    findJoinedRoom:
    for (const roomId in joinedRooms.value) {
        const room = joinedRooms.value[roomId]
        if (!room) continue
        if (room.accountData['m.tag']?.tags?.['m.server_notice']) continue
        const roomUserIds = new Set<string>((room.stateEventsByType['m.room.member'] ?? [])
            .filter((memberEvent) => (
                (memberEvent.content.membership === 'join' && memberEvent.sender !== sessionUserId.value)
                || (memberEvent.content.membership === 'invite') && memberEvent.stateKey !== sessionUserId.value))
            .map((memberEvent) => memberEvent.content.membership === 'invite' ? memberEvent.stateKey ?? memberEvent.sender : memberEvent.sender))
        if (selectedUserIdSet.size !== roomUserIds.size) continue
        for (const userId of roomUserIds) {
            if (!selectedUserIdSet.has(userId)) {
                continue findJoinedRoom
            }
        }
        if (hiddenRooms.value[roomId]) {
            toggleRoomVisibility(roomId, true)
        }
        router.push({
            name: 'room',
            params: { roomId },
        })
        emit('update:visible', false)
        toggleApplicationSidebar(false)
        return
    }

    // See if there is an existing invited room and navigate to it.
    findInvitedRoom:
    for (const roomId in invitedRooms.value) {
        const room = invitedRooms.value[roomId]
        if (!room) continue
        const roomUserIds = new Set<string>((room.stateEventsByType['m.room.member'] ?? [])
            .filter((memberEvent) => (
                (memberEvent.content.membership === 'join' && memberEvent.sender !== sessionUserId.value)
                || (memberEvent.content.membership === 'invite') && memberEvent.stateKey !== sessionUserId.value))
            .map((memberEvent) => memberEvent.content.membership === 'invite' ? memberEvent.stateKey ?? memberEvent.sender : memberEvent.sender))
        if (selectedUserIdSet.size !== roomUserIds.size) continue
        for (const userId of roomUserIds) {
            if (!selectedUserIdSet.has(userId)) {
                continue findInvitedRoom
            }
        }
        if (hiddenRooms.value[roomId]) {
            toggleRoomVisibility(roomId, true)
        }
        router.push({
            name: 'room',
            params: { roomId },
        })
        emit('update:visible', false)
        toggleApplicationSidebar(false)
        return
    }

    draftRoom.value = {
        invited: Array.from(selectedUserIdSet),
    }
    if (groupName.value) {
        draftRoom.value.groupName = groupName.value
    }
    if (groupAvatarBlob.value) {
        draftRoom.value.groupAvatar = groupAvatarBlob.value
    }
    router.push({
        name: 'create-room',
    })
    emit('update:visible', false)
    toggleApplicationSidebar(false)
}

watch(() => props.visible, (visible, wasVisible) => {
    if (visible && !wasVisible) {
        currentlyRunningUserDirectorySearchTerm = ''
        userSearchText.value = ''
        groupName.value = ''
        groupAvatarBlob.value = undefined
        selectedUserIds.value = []
        populateContactList()
    } else if (!visible && wasVisible) {
        clearTimeout(userDirectorySearchTimeoutHandle)
        userDirectorySearchAbortController?.abort()
        if (groupAvatarObjectUrl.value) {
            URL.revokeObjectURL(groupAvatarObjectUrl.value)
        }
    }
}, { immediate: true })

</script>

<style lang="scss" scoped>
.p-scrollpanel {
    flex-grow: 1;
    flex-shrink: 1;
    margin: 0 -0.5rem;
    overflow: hidden;

    :deep(p) {
        margin: 1rem 0;

        &:first-child {
            margin-top: 0;
        }
        &:last-child {
            margin-bottom: 0;
        }
    }
}

.user-checkbox-list__item {
    display: flex;
    align-items: center;
    border-radius: var(--radius-sm);
    padding: 0.5rem;
    font-size: 0.875rem;
    gap: 0.5rem;
    height: 3rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
        background: hsl(var(--neutral-50-hsl)/.3);
    }

    &.user-checkbox-list__item--selected {
        background: hsl(var(--neutral-50-hsl)/.3);
    }
}
.edit-group__edit-avatar-button {
    position: relative;
    width: 5rem;
    height: 5rem;
    flex-shrink: 0;
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