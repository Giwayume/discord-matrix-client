<template>
    <Dialog
        :visible="visible"
        modal
        :header="dialogTitle"
        :style="{ width: 'calc(100% - 1rem)', maxWidth: '30rem' }"
        @update:visible="(visible) => emit('update:visible', visible)"
    >
        <div v-if="!isMessageEncrypted" v-html="micromark(t('fixDecryption.messageNotEncryptedInEncryptedRoom', { messageSenderDisplayname }))" />
        <template v-else-if="encryptionNotSupported">
            <template v-if="isSecureContext">
                {{ t('fixDecryption.deviceEncryptionNotSupported') }}
            </template>
            <template v-else>
                {{ t('fixDecryption.deviceEncryptionNotEnabledSecureContext') }}
            </template>
        </template>
        <template v-else-if="isRequestKeysError">
            {{ t('fixDecryption.roomKeyRequestError' )}}
        </template>
        <template v-else-if="isRequestingKeys">
            <template v-if="isDiscoveringUsers">
                {{ t('fixDecryption.roomKeyRequestDiscoveringUsers') }}
            </template>
        </template>
        <template v-else-if="!messageHasRoomKey">
            <p>{{ t('fixDecryption.roomKeyRequestInstructions') }}</p>
            <div class="flex mt-5 mb-2">
                <Button :label="t('fixDecryption.requestKeysButton')" class="ml-auto" @click="requestKeys" />
            </div>
        </template>
        <template v-else>
            <!-- {{ t('fixDecryption.unknownError') }} -->
        </template>

        <!-- <p class="text-(--text-default)">{{ t('identityVerification.subtitle') }}</p>
        <div class="flex items-stretch justify-center gap-2 my-5">
            <Button severity="secondary">
                <div class="flex flex-col items-center">
                    <span class="pi pi-mobile !text-2xl mb-2" aria-hidden="true" />
                    {{ t('identityVerification.verifyWithAnotherDeviceButton') }}
                </div>
            </Button>
            <Button severity="secondary" @click="recoveryKeyDialogVisible = true">
                <div class="flex flex-col items-center">
                    <span class="pi pi-key !text-2xl mb-2" aria-hidden="true" />
                    {{ t('identityVerification.verifyWithRecoveryKeyButton') }}
                </div>
            </Button>
        </div>
        <p class="text-sm text-(--text-muted)">
            {{ t('identityVerification.lostRecoveryMethods') }}
            <a href="#">{{ t('identityVerification.resetIdentityLink') }}</a>
        </p> -->
    </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { micromark } from 'micromark'

import { useCryptoKeys } from '@/composables/crypto-keys'
import { createLogger } from '@/composables/logger'

import { useCryptoKeysStore } from '@/stores/crypto-keys'
import { useProfileStore } from '@/stores/profile'
import { useRoomStore } from '@/stores/room'
import { useSessionStore } from '@/stores/session'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

import { type EventRoomEncryptedContent } from '@/types'

const log = createLogger(import.meta.url)

const { t } = useI18n()
const { fetchUserKeys, requestRoomKey } = useCryptoKeys()

const {
    encryptionNotSupported,
    roomKeys,
    deviceKeys,
    userSigningKeys,
} = storeToRefs(useCryptoKeysStore())
const roomStore = useRoomStore()
const { profiles } = storeToRefs(useProfileStore())
const { userId: sessionUserId } = storeToRefs(useSessionStore())
const {
    joined: joinedRooms,
} = storeToRefs(roomStore)
const {
    getTimelineEventById,
} = roomStore

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    roomId: {
        type: String,
        default: undefined,
    },
    eventId: {
        type: String,
        default: undefined,
    },
})

const emit = defineEmits<{
    (e: 'update:visible', visible: boolean): void
}>()

watch(() => props.visible, (visible, wasVisible) => {
    if (visible && !wasVisible) {
        isRequestingKeys.value = false
    }
})

const isSecureContext = !!window.isSecureContext

const event = computed(() => {
    const room = joinedRooms.value[props.roomId ?? -1]
    if (!room) return
    return getTimelineEventById(room.visibleTimeline, props.eventId)
})

const isMessageEncrypted = computed(() => {
    return event.value?.type === 'm.room.encrypted'
})

const messageSenderDisplayname = computed(() => {
    return profiles.value[event.value?.sender ?? '']?.displayname ?? event.value?.sender ?? 'Unknown User'
})

const dialogTitle = computed(() => {
    return isMessageEncrypted.value ? t('fixDecryption.title') : t('fixDecryption.noEncryptionTitle')
})

const messageHasRoomKey = computed<boolean>(() => {
    if (!event.value) return false
    if (event.value.type === 'm.room.encrypted') {
        const eventContent = event.value.content as EventRoomEncryptedContent
        return !!roomKeys.value[props.roomId!]?.[eventContent.sessionId!]?.[eventContent.senderKey!]
    }
    return false
})

/*----------------*\
|                  |
|   Request Keys   |
|                  |
\*----------------*/

const isRequestingKeys = ref<boolean>(false)
const isRequestKeysError = ref<boolean>(false)
const isDiscoveringUsers = ref<boolean>(false)


async function requestKeys() {
    isRequestingKeys.value = true
    isDiscoveringUsers.value = true

    if (event.value?.type !== 'm.room.encrypted') return
    let eventContent = event.value.content as EventRoomEncryptedContent
    if (!eventContent?.sessionId) return

    try {
        const room = joinedRooms.value[props.roomId ?? -1]
        if (!room) throw new Error('Missing room.')

        const userIds = Array.from(new Set(room.stateEventsByType['m.room.member']
            ?.filter((memberEvent) => memberEvent.content?.membership === 'join' && memberEvent.sender !== sessionUserId.value)
            ?.map((memberEvent) => memberEvent.sender) ?? []))

        if (userIds.length === 0) throw new Error('No other joined members in room.')

        await fetchUserKeys([ ...userIds, sessionUserId.value! ])

        for (const userId of userIds) {
            const userDeviceKeys = deviceKeys.value[userId]
            for (const deviceId in userDeviceKeys) {
                if (deviceId !== 'CHIjNVrySd') continue // TODO - TESTING, remove
                await requestRoomKey(room.roomId, eventContent.sessionId, userId, deviceId)
            }
        }

        isDiscoveringUsers.value = false
    } catch (error) {
        log.error('Error while requesting keys: ', error)
        isRequestKeysError.value = true
    } finally {
        isRequestingKeys.value = false
    }

}

</script>

<style lang="scss" scoped>
:deep(p) {
    margin: 1rem 0;
    &:first-child {
        margin-top: 0;
    }
    &:last-child {
        margin-bottom: 0;
    }
    + ul, + ol {
        margin-top: -1rem;
    }
}
:deep(ul) {
    display: block;
    list-style: disc;
    padding: 0 0 0 1.5rem;
    line-height: 1.2;
    margin: 0;
    white-space-collapse: collapse;

    li {
        display: list-item;
        margin: 0;
        white-space: break-spaces;
        line-height: 1.5;
    }
}
:deep(ol) {
    display: block;
    list-style: decimal;
    padding: 0 0 0 1.5rem;
    line-height: 1.2;
    margin: 0;
    white-space-collapse: collapse;

    li {
        display: list-item;
        margin: 0;
        white-space: break-spaces;
        line-height: 1.5;
    }
}
</style>