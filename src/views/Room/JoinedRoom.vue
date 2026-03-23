<template>
    <MainHeader>
        <div class="flex pl-4 py-2 pr-2 items-center">
            <template v-if="isInsideSpace">
                <span class="pi pi-hashtag w-4 mr-2 text-center text-(--channel-icon)" />
            </template>
            <template v-else-if="otherMembersDisplayed.length === 1">
                <OverlayStatus level="low" :status="otherMembersDisplayed[0]!.presence" size="small" class="w-5 h-5 mr-2">
                    <AuthenticatedImage :mxcUri="otherMembersDisplayed[0]!.avatarUrl" type="thumbnail" :width="48" :height="48" method="scale">
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
                        <AuthenticatedImage :mxcUri="member.avatarUrl" type="thumbnail" :width="48" :height="48" method="scale">
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
                <template v-else>{{ roomMemberListDisplay }}</template>
            </h1>
        </div>
    </MainHeader>
    <MainBody :disableScrollbar="true">
        <TimelineEvents
            ref="timelineEvents"
            :key="`TimelineEventsFor${props.room.roomId}`"
            :room="props.room"
            :referenceEventId="replyToEventId || editEventId"
            @update:anchoredToBottom="isAnchoredToBottom = $event"
            @update:editEventId="onUpdateEditEventId"
            @update:replyToEventId="onUpdateReplyToEventId"
            @retrySendMessage="retrySendMessage($event)"
            @selectEmoji="showExpressionPicker"
            @toggleEmoji="onEmojiSelected"
        />
        <template #footer>
            <div v-if="typingDisplayNames.length > 0 && isAnchoredToBottom" class="relative">
                <div class="joined-room__typing-indicator">
                    <div class="p-button-loading">
                        <div class="p-button-loading-dots" />
                    </div>
                    <I18nT tag="div" :keypath="typingDisplayMessageKey" scope="global">
                        <template #displayname>
                            <strong>{{ typingDisplayNames }}</strong>
                        </template>
                    </I18nT>
                </div>
            </div>
            <div v-if="replyToEventId || editEventId" class="joined-room__reply-bar">
                <template v-if="replyToEventId">
                    {{ t('room.replyingTo') }} <strong>{{ replyToDisplayName }}</strong>
                </template>
                <template v-else>
                    {{ t('room.messageEditing') }}
                </template>
                <Button
                    icon="pi pi-times-circle" rounded severity="secondary"
                    variant="text" :aria-label="replyToEventId ? t('room.messageCancelReplyButton') : t('room.messageCancelEditButton')"
                    @click="onCancelEditOrReply()"
                />
            </div>
            <form class="joined-room__chat-bar" @submit.prevent="onSubmitMessageForm">
                <div class="joined-room__chat-bar-input">
                    <Button
                        icon="pi pi-plus"
                        severity="secondary"
                        variant="text"
                        class="!h-8 !w-8 !mt-[0.6875rem]"
                        :aria-label="t('room.messageAddButton')"
                    />
                    <Textarea
                        v-model="message"
                        ref="messageTextarea"
                        rows="1"
                        autoResize
                        class="p-textarea-transparent"
                        :placeholder="t('room.messagePlaceholder', { roomName: roomName ?? roomMemberListDisplay })"
                        @keydown="onKeydownMessageTextarea"
                        @input="onInputMessageTextarea"
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
        :emojiOnly="expressionPickerEmojiOnly"
        @selectEmoji="onEmojiSelected"
        @hidden="onExpressionPickerHidden"
    />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, reactive, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

import { vPointer } from '@/directives/pointer'

import { useApplication } from '@/composables/application'
import { useCryptoKeys } from '@/composables/crypto-keys'
import { useEmoji } from '@/composables/emoji'
import { createLogger } from '@/composables/logger'
import { useRooms } from '@/composables/rooms'

import { useProfileStore } from '@/stores/profile'
import { useRoomStore } from '@/stores/room'
import { useSessionStore } from '@/stores/session'

import { HttpError, PendingNetworkRequestError } from '@/utils/error'
import { formatMessage } from '@/utils/message'
import { isRoomPartOfSpace } from '@/utils/room'
import { throttle } from '@/utils/timing'

import AuthenticatedImage from '@/views/Common/AuthenticatedImage.vue'
const ExpressionPicker = defineAsyncComponent(() => import('@/views/Room/ExpressionPicker.vue'))
import MainBody from '@/views/Layout/MainBody.vue'
import MainHeader from '@/views/Layout/MainHeader.vue'
import OverlayStatus from '@/views/Common/OverlayStatus.vue'

import TimelineEvents from './TimelineEvents.vue'

import Avatar from 'primevue/avatar'
import AvatarGroup from 'primevue/avatargroup'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'

import {
    type JoinedRoom,
    type EventTextContent,
    type ApiV3SyncClientEventWithoutRoomId,
    type EmojiPickerEmojiItem,
} from '@/types'

const log = createLogger(import.meta.url)

const { t } = useI18n()
const toast = useToast()
const { isTouchEventsDetected } = useApplication()
const { sendTypingNotification, sendMessageEvent, sendMessageReaction } = useRooms()

const { fetchUserKeys } = useCryptoKeys()
const { currentRoomCustomEmojiByCode } = useEmoji()
const roomStore = useRoomStore()
const {
    getTimelineEventIndexById,
    getTimelineEventById,
    associateTransactionIdWithEventId,
    populateSentMessageEvent
} = roomStore
const { profiles } = storeToRefs(useProfileStore())
const { userId: sessionUserId } = storeToRefs(useSessionStore())

const props = defineProps({
    room: {
        type: Object as PropType<JoinedRoom>,
        required: true,
    }
})

/*-----------------*\
|                   |
|   General state   |
|                   |
\*-----------------*/

const timelineEvents = ref<InstanceType<typeof TimelineEvents>>()
const isAnchoredToBottom = ref<boolean>(false)
const message = ref<string>('')
const messageTextarea = ref<InstanceType<typeof Textarea>>()

const replyToDisplayName = computed<string | undefined>(() => {
    if (!replyToEventId.value) return
    const event = getTimelineEventById(props.room.visibleTimeline, replyToEventId.value)
    return event?.sender ? (profiles.value[event.sender]?.displayname ?? event.sender) : undefined
})

const roomName = computed<string | undefined>(() => {
    const roomNameEvent = props.room.stateEventsByType['m.room.name']?.[0]
    return roomNameEvent?.content.name
})

const roomMemberListDisplay = computed<string>(() => {
    return Array.from(new Set(otherMembersDisplayed.value.map((member) => member.displayname ?? member.userId))).join(', ')
})

const isInsideSpace = computed<boolean>(() => {
    return isRoomPartOfSpace(props.room)
})

const otherMembers = computed(() => {
    return (props.room as JoinedRoom).stateEventsByType['m.room.member']?.filter((member) => {
        const userId = member.content.membership === 'join' ? member.sender : member.content.membership === 'invite' ? member.stateKey : undefined
        return userId && userId != sessionUserId.value
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

/*-------------------------*\
|                           |
|   Fetch Encryption Keys   |
|                           |
\*-------------------------*/

watch(() => props.room.stateEventsByType['m.room.member'], (members) => {
    if (!members) return
    const userIds: string[] = []
    for (const member of members) {
        if (member.content?.membership !== 'join') continue
        userIds.push(member.sender)
    }
    fetchUserKeys(userIds)
}, { immediate: true })

/*---------------------*\
|                       |
|   Typing indicators   |
|                       |
\*---------------------*/

const typingUserIds = computed(() => {
    return props.room.typingUserIds.filter((id) => id != sessionUserId.value)
})

const typingDisplayNames = computed(() => {
    return typingUserIds.value.map((userId) => {
        return profiles.value[userId]?.displayname ?? userId
    }).join(', ')
})

const typingDisplayMessageKey = computed(() => {
    if (typingUserIds.value.length === 1) {
        return 'room.typingIndicatorSingle'
    } else if (typingUserIds.value.length < 3) {
        return 'room.typingIndicatorMultiple'
    } else {
        return 'room.typingIndicatorSeveral'
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

async function onEmojiSelected(emoji: EmojiPickerEmojiItem, referenceEventId?: string) {
    referenceEventId = referenceEventId ?? expressionPickerTriggerReferenceEventId.value
    if (referenceEventId) {
        try {
            await sendMessageReaction(props.room.roomId, emoji.emoji, referenceEventId)
        } catch (error) {
            let messageText = t('errors.unexpected')
            if (error instanceof PendingNetworkRequestError) {
                messageText = t('errors.message.pendingReaction')
            } else if (error instanceof HttpError) {
                if (error.isMatrixGuestAccessForbidden()) {
                    messageText = t('errors.message.guestReaction')
                } else if (error.isMatrixForbidden()) {
                    messageText = t('errors.message.forbidden')
                }
            }
            toast.add({ severity: 'error', summary: messageText, life: 4000 })
            log.error('Error sending reaction.', error)
        }
    } else if (messageTextarea.value) {
        const textarea = (messageTextarea.value as any).$el as HTMLTextAreaElement
        if (textarea.selectionStart > -1) {
            const beforeText = message.value.slice(0, textarea.selectionStart)
            const afterText = message.value.slice(textarea.selectionEnd)
            message.value = beforeText + (beforeText.length > 0 && beforeText.charAt(beforeText.length - 1) !== ' ' ? ' ' : '')
                + emoji.emoji + (afterText.length > 0 && afterText.charAt(0) !== '' ? ' ' : '') + afterText
        }
    }
    expressionPicker.value?.hide()
}

async function onExpressionPickerHidden() {
    timelineEvents.value?.resetMessageActionsContextMenuTargetEventId()
}

/*---------------------------------*\
|                                   |
|   Editing / replying to message   |
|                                   |
\*---------------------------------*/

const editEventId = ref<string | undefined>()
const replyToEventId = ref<string | undefined>()

function onUpdateEditEventId(eventId: string | undefined) {
    replyToEventId.value = undefined
    editEventId.value = eventId
    const event = props.room.replacements[eventId ?? '']?.[0] ?? getTimelineEventById(props.room.visibleTimeline, eventId)
    if (event) {
        message.value = event.content?.['invalid.discortix.unredacted_body']
            ?? event.content?.body ?? ''
    }
    if (eventId) {
        (messageTextarea.value as any)?.$el?.focus()
    }
}

function onUpdateReplyToEventId(eventId: string | undefined) {
    if (editEventId.value) {
        editEventId.value = undefined
        message.value = ''
    }
    replyToEventId.value = eventId
    if (eventId) {
        (messageTextarea.value as any)?.$el?.focus()
    }
}

function onCancelEditOrReply() {
    replyToEventId.value = undefined
    if (editEventId.value) {
        editEventId.value = undefined
        message.value = ''
    }
}

watch(() => props.room.roomId, () => {
    editEventId.value = undefined
    replyToEventId.value = undefined
    message.value = ''
})

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

let lastTypingNotificationSentTimestamp: number = 0
let stopTypingTimeoutHandle: number | undefined = undefined
const onInputMessageTextarea = throttle(() => {
    if (message.value.length > 0) {
        clearTimeout(stopTypingTimeoutHandle)
        const now = window.performance.now()
        if (now - lastTypingNotificationSentTimestamp > 15000) {
            lastTypingNotificationSentTimestamp = now
            sendTypingNotification(props.room.roomId, true)
        }
        stopTypingTimeoutHandle = window.setTimeout(onStopTyping, 5000)
    } else {
        onStopTyping()
    }
}, 2500)

function onStopTyping() {
    lastTypingNotificationSentTimestamp = 0
    clearTimeout(stopTypingTimeoutHandle)
    stopTypingTimeoutHandle = undefined
    sendTypingNotification(props.room.roomId, false)
}

/*---------------------*\
|                       |
|   Sending a message   |
|                       |
\*---------------------*/

async function onSubmitMessageForm() {
    if (message.value.trim() === '') return

    await timelineEvents.value?.scrollToBottom()

    const txnId = uuidv4()
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

    if (replyToEventId.value) {
        eventContent['m.relates_to'] = {
            'm.in_reply_to': {
                eventId: replyToEventId.value,
            },
        }
    } else if (editEventId.value) {
        eventContent['m.relates_to'] = {
            relType: 'm.replace',
            eventId: editEventId.value,
        }
        eventContent['m.new_content'] = {
            ...eventContent,
        }
        eventContent.body = '* ' + eventContent.body
        if (eventContent.formattedBody) {
            eventContent.formattedBody = '* ' + eventContent.formattedBody
        }
    }

    const event: ApiV3SyncClientEventWithoutRoomId = reactive({
        content: eventContent,
        eventId: `PLACEHOLDER_${txnId}`,
        originServerTs: Date.now(),
        sender: sessionUserId.value!,
        type: 'm.room.message',
        txnId,
        sendError: false,
    })

    message.value = ''
    replyToEventId.value = undefined
    editEventId.value = undefined

    populateSentMessageEvent(props.room.roomId, event)

    try {
        const response = await sendMessageEvent<EventTextContent>(
            props.room.roomId, 'm.room.message', txnId, event.content
        )
        associateTransactionIdWithEventId(props.room.roomId, txnId, response.eventId)
    } catch (error) {
        event.sendError = true
    }
}

async function retrySendMessage(eventId?: string) {
    const eventIndex = getTimelineEventIndexById(props.room.visibleTimeline, eventId)
    const event = props.room.visibleTimeline[eventIndex ?? -1]
    if (!event?.txnId) return
    event.sendError = false

    try {
        const response = await sendMessageEvent(
            props.room.roomId, event.type, event.txnId, event.content
        )
        associateTransactionIdWithEventId(props.room.roomId, event.txnId, response.eventId)
    } catch (error) {
        event.sendError = true
    }
}

</script>

<style lang="scss" scoped>
.joined-room__typing-indicator {
    background: var(--background-base-lower);
    position: absolute;
    display: flex;
    overflow: hidden;
    align-items: center;
    padding: 0 0 0 4.5rem;
    top: -1.75rem;
    left: 0;
    right: 0;
    height: 1.75rem;
    font-size: 0.875rem;
    color: var(--channels-default);
    z-index: 1;

    strong {
        color: var(--text-strong);
    }

    .p-button-loading {
        position: absolute;
        left: 2.25rem;
        top: 0.875rem;
        transform: scale(0.75);
    }
}
.joined-room__reply-bar {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    overflow: hidden;
    position: relative;
    background: var(--background-surface-higher);
    border-bottom: 1px solid var(--border-subtle);
    border-start-end-radius: var(--radius-sm);
    border-start-start-radius: var(--radius-sm);
    font-size: 0.875rem;
    padding: 0.1875rem 3rem 0 1rem;
    margin: 0 3.75rem 0 0.5rem;
    min-height: 2.1875rem;

    .p-button {
        position: absolute;
        top: 50%;
        right: 0.5rem;
        transform: translateY(-50%);

        --p-icon-size: 0.875rem;
    }

    ~ .joined-room__chat-bar {
        .joined-room__chat-bar-input {
            border-start-end-radius: 0;
            border-start-start-radius: 0;
        }
    }
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