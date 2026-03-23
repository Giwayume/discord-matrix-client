<template>
    <Application
        key="mainApplication"
        :title="t('createRoom.title')"
        titleIcon="pi pi-comments"
    >
        <template #sidebar-list>
            <SidebarListSpaceRooms v-if="isInsideSpace" />
            <SidebarListDirectMessages v-else />
        </template>
        <MainHeader>
            <div class="flex pl-4 py-2 pr-2 items-center">
                <h1 class="font-medium text-(--text-strong) mr-2">
                    {{ t('createRoom.title') }}
                </h1>
            </div>
        </MainHeader>
        <MainBody>
            <div class="p-chattimeline w-full">
                <MessagePlaceholder v-if="isCreatingRoom" />
                <MessageBeginning v-else :room="simulatedJoinedRoom" :roomAvatarPreviewObjectUrl="roomAvatarPreviewObjectUrl" />
            </div>
            <template #footer>
                <form class="joined-room__chat-bar" @submit.prevent="onSubmitMessageForm">
                    <div class="joined-room__chat-bar-input">
                        <Textarea
                            v-model="message"
                            ref="messageTextarea"
                            rows="1"
                            autoResize
                            class="p-textarea-transparent"
                            :placeholder="t('createRoom.inputPlaceholder')"
                            @keydown="onKeydownMessageTextarea"
                        />
                        <Button
                            v-pointer="{ click: showExpressionPicker }"
                            icon="pi pi-face-smile"
                            severity="secondary"
                            variant="text"
                            class="!h-8 !w-8 !mt-[0.6875rem]"
                            :aria-label="t('room.messageEmojiButton')"
                        />
                    </div>
                    <Button
                        type="submit"
                        icon="pi pi-send"
                        rounded
                        class="!h-11 !w-11 !mr-2 !mt-[0.375rem] shrink-0"
                        :aria-label="t('room.messageSendButton')"
                    />
                </form>
            </template>
        </MainBody>
        <ExpressionPicker
            ref="expressionPicker"
            :emojiOnly="true"
            @selectEmoji="onEmojiSelected"
        />
    </Application>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

import { formatMessage } from '@/utils/message'
import { until } from '@/utils/vue'

import { useApplication } from '@/composables/application'
import { useEmoji } from '@/composables/emoji'
import { createMediaInfo, createLazyMediaUpload } from '@/composables/media'
import { useRooms } from '@/composables/rooms'

import { useRoomStore } from '@/stores/room'
import { useSessionStore } from '@/stores/session'
import { vPointer } from '@/directives/pointer'

import Application from '@/views/Layout/Application.vue'
const ExpressionPicker = defineAsyncComponent(() => import('@/views/Room/ExpressionPicker.vue'))
import MainBody from '@/views/Layout/MainBody.vue'
import MainHeader from '@/views/Layout/MainHeader.vue'
import MessageBeginning from '@/views/Room/MessageBeginning.vue'
import MessagePlaceholder from '@/views/Room/MessagePlaceholder.vue'
import SidebarListDirectMessages from '@/views/Layout/SidebarListDirectMessages.vue'
import SidebarListSpaceRooms from '@/views/Layout/SidebarListSpaceRooms.vue'

import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'

import {
    type EmojiPickerEmojiItem, type JoinedRoom,
    type EventTextContent, type EventRoomAvatarContent,
    type ApiV3SyncClientEventWithoutRoomId,
    type ApiV3RoomCreateRequest,
    type EventRoomNameContent, type EventRoomMemberContent,
    type MediaInfo,
} from '@/types'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const { isTouchEventsDetected } = useApplication()
const { currentRoomCustomEmojiByCode } = useEmoji()
const { createRoom, sendMessageEvent } = useRooms()

const { draft, joined: joinedRooms } = storeToRefs(useRoomStore())
const { userId: sessionUserId } = storeToRefs(useSessionStore())

onMounted(() => {
    if (!draft.value) {
        router.replace({ name: 'home' })
    }
})

/*-----------------*\
|                   |
|   General state   |
|                   |
\*-----------------*/

const message = ref<string>('')
const messageTextarea = ref<InstanceType<typeof Textarea>>()

const isInsideSpace = computed<boolean>(() => {
    return !!draft.value?.spaceRoomId
})

const simulatedJoinedRoom = computed<JoinedRoom>(() => {

    let roomNameEvent: ApiV3SyncClientEventWithoutRoomId<EventRoomNameContent> | undefined
        = draft.value?.groupName
        ? {
            type: 'm.room.name',
            eventId: '',
            originServerTs: 0,
            sender: sessionUserId.value!,
            content: {
                name: draft.value?.groupName,
            }
        } : undefined
    
    let memberEvents: ApiV3SyncClientEventWithoutRoomId<EventRoomMemberContent>[] = []
    memberEvents.push({
        type: 'm.room.member',
        eventId: '',
        originServerTs: 0,
        sender: sessionUserId.value!,
        content: {
            membership: 'join'
        }
    })
    for (const invitedUserId of draft.value?.invited ?? []) {
        memberEvents.push({
            type: 'm.room.member',
            eventId: '',
            originServerTs: 0,
            sender: sessionUserId.value!,
            stateKey: invitedUserId,
            content: {
                membership: 'invite'
            }
        })
    }

    return {
        roomId: '',
        accountData: {},
        nonSequentialUpdateUuid: '',
        reactions: {},
        readRecepts: {},
        redactions: [],
        replacements: {},
        stateEventsById: {},
        stateEventsByType: {
            'm.room.name': roomNameEvent ? [roomNameEvent] : [],
            'm.room.member': memberEvents,
        },
        summary: {},
        visibleTimeline: [],
        invisibleTimeline: [],
        typingUserIds: [],
        unreadNotifications: {
            highlightCount: 0,
            notificationCount: 0,
        },
        unreadThreadNotifications: {},
    } as JoinedRoom
})

/*-----------------------*\
|                         |
|   Room avatar preview   |
|                         |
\*-----------------------*/

const roomAvatarPreviewObjectUrl = ref<string | undefined>()
watch(() => draft.value?.groupAvatar, (groupAvatar) => {
    if (roomAvatarPreviewObjectUrl.value) {
        URL.revokeObjectURL(roomAvatarPreviewObjectUrl.value)
    }
    if (groupAvatar) {
        roomAvatarPreviewObjectUrl.value = URL.createObjectURL(groupAvatar)
    } else {
        roomAvatarPreviewObjectUrl.value = undefined
    }
}, { immediate: true })
onUnmounted(() => {
    if (roomAvatarPreviewObjectUrl.value) {
        URL.revokeObjectURL(roomAvatarPreviewObjectUrl.value)
    }
})

/*-----------------------------*\
|                               |
|   Expression / emoji picker   |
|                               |
\*-----------------------------*/

const expressionPicker = ref<InstanceType<typeof ExpressionPicker>>()
const expressionPickerTriggerReferenceEventId = ref<string | undefined>()
const expressionPickerEmojiOnly = ref<boolean>(false)

function showExpressionPicker(event: Event, referenceEventId?: string) {
    expressionPickerTriggerReferenceEventId.value = referenceEventId
    expressionPickerEmojiOnly.value = !!referenceEventId
    expressionPicker.value?.show(event)
}

async function onEmojiSelected(emoji: EmojiPickerEmojiItem) {
    const textarea = (messageTextarea.value as any).$el as HTMLTextAreaElement
    if (textarea.selectionStart > -1) {
        const beforeText = message.value.slice(0, textarea.selectionStart)
        const afterText = message.value.slice(textarea.selectionEnd)
        message.value = beforeText + (beforeText.length > 0 && beforeText.charAt(beforeText.length - 1) !== ' ' ? ' ' : '')
            + emoji.emoji + (afterText.length > 0 && afterText.charAt(0) !== '' ? ' ' : '') + afterText
    }
    expressionPicker.value?.hide()
}

/*------------------------------*\
|                                |
|   Typing in message textarea   |
|                                |
\*------------------------------*/

function onKeydownMessageTextarea(event: KeyboardEvent) {
    if (event.code === 'Enter' && !event.shiftKey && !isTouchEventsDetected.value) {
        event.preventDefault()
        onSubmitMessageForm()
    }
}

/*---------------------*\
|                       |
|   Sending a message   |
|                       |
\*---------------------*/

const isCreatingRoom = ref<boolean>(false)

watch(() => draft.value, () => {
    isCreatingRoom.value = false
    message.value = ''
})

async function onSubmitMessageForm() {
    if (message.value.trim() === '') return
    isCreatingRoom.value = true

    let createdRoomId: string | undefined = undefined
    let avatarMxcUri: string | undefined = undefined
    try {
        const createRoomRequest: ApiV3RoomCreateRequest = {
            initial_state: [],
            is_direct: draft.value?.invited.length === 1,
            preset: draft.value?.invited.length === 1 ? 'trusted_private_chat' : 'private_chat',
        }

        if (draft.value?.invited) {
            createRoomRequest.invite = draft.value.invited
        }
        if (draft.value?.groupName) {
            createRoomRequest.name = draft.value.groupName
        }

        let avatarUpload: ReturnType<typeof createLazyMediaUpload> | undefined = undefined
        let mediaInfo: MediaInfo | undefined = undefined


        uploadGroupAvatar:
        if (draft.value?.groupAvatar) {
            avatarUpload = createLazyMediaUpload()

            mediaInfo = await createMediaInfo(draft.value.groupAvatar)
            if (mediaInfo.type !== 'image') break uploadGroupAvatar

            avatarMxcUri = await avatarUpload.useBlob(draft.value.groupAvatar)

            createRoomRequest.initial_state?.push({
                type: 'm.room.avatar',
                state_key: '',
                content: {
                    url: avatarMxcUri,
                    info: mediaInfo.info,
                },
            })
        }

        ({ roomId: createdRoomId } = await createRoom(createRoomRequest))

        try {
            // A new MXC URI can be assigned if waited too long to upload.
            const newAvatarMxcUri = await avatarUpload?.upload()
            if (newAvatarMxcUri) {
                await sendMessageEvent<EventRoomAvatarContent>(
                    createdRoomId, 'm.room.avatar', uuidv4(), {
                        url: newAvatarMxcUri,
                        info: mediaInfo?.type === 'image' ? mediaInfo.info : undefined,
                    }
                )   
            }
        } catch (error) { /* Ignore - user can try again later. */ }

    } catch (error) {
        toast.add({ severity: 'error', summary: t('createRoom.errorCreatingRoomToast'), life: 5000 })
    }

    if (createdRoomId) {
        try {
            const { body, unredactedBody, formattedBody } = formatMessage(message.value, currentRoomCustomEmojiByCode.value, t)

            const eventContent: EventTextContent = {
                body,
                format: formattedBody != body ? 'org.matrix.custom.html' : undefined,
                formattedBody: formattedBody != body ? formattedBody : undefined,
                msgtype: 'm.text',
            }

            if (unredactedBody) {
                eventContent['invalid.discortix.unredacted_body'] = unredactedBody
            }
            
            await sendMessageEvent<EventTextContent>(
                createdRoomId, 'm.room.message', uuidv4(), eventContent,
            )
        } catch (error) {
            toast.add({ severity: 'error', summary: t('createRoom.errorSendingFirstMessageToast'), life: 5000 })
        }
    }

    message.value = ''

    if (createdRoomId) {
        await until(() => {
            return !!joinedRooms.value[createdRoomId]
        }, 5000)

        router.push({
            name: 'room',
            params: { roomId: createdRoomId },
        })
    }

}

</script>

<style lang="scss" scoped>
:deep(.p-scrollpanel-content) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    flex-shrink: 1;
    overflow: hidden;
}
.p-chattimeline {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
}
.joined-room__chat-bar {
    display: flex;
    align-items: flex-start;
    
    .joined-room__chat-bar-input {
        display: flex;
        align-items: flex-start;
        min-height: 3.5rem;
        padding: 0 0.5rem 0 0.5rem;
        margin: 0 0.5rem 0.5rem 0.5rem;
        background: var(--chat-background-default);
        border: 1px solid var(--border-muted);
        border-radius: var(--radius-sm);
        flex-grow: 1;
        flex-shrink: 1;
        overflow: hidden;

        .p-textarea {
            align-self: center;
            flex-grow: 1;
            max-height: 50dvh;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            overscroll-behavior: none;
            flex-shrink: 1 !important;
            min-width: 0 !important;

            &[style *= "44px"] {
                overflow: hidden !important;
            }
        }
    }

    > :deep(.p-button) > .p-button-icon {
        transform: translateX(-0.125rem) rotate(45deg);
    }
}
</style>
