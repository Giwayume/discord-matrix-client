import { computed, ref, toRaw, watch } from 'vue'
import { defineStore, storeToRefs } from 'pinia'

import { useBroadcast } from '@/composables/broadcast'

import { saveTableKey as saveDiscortixTableKey } from '@/stores/database/discortix'

import { encryptSecret } from '@/utils/secret-storage'

import type {
    EventForwardedRoomKeyContent,
} from '@/types'

export const useCryptoKeysStore = defineStore('cryptoKeys', () => {
    const { onTabMessage, broadcastMessageFromTab } = useBroadcast()

    const userId = ref<string | undefined>()
    const deviceId = ref<string | undefined>()

    // TODO - prompt user action based on these error scenarios
    const encryptionNotSupported = ref<boolean>(false)
    const roomKeyLoadFailed = ref<boolean>(false)
    const signingKeysValidationFailed = ref<boolean>(false)
    const signingKeysUploadFailed = ref<boolean>(false)
    const secretKeyIdsMissing = ref<string[]>([])
    const vodozemacInitFailed = ref<boolean>(false)

    // Session store relies on crypto keys. Since we have a circular dependency, dynamic import needed fields.
    async function initialize() {
        const { useSessionStore } = await import('@/stores/session')
        const { userId: sessionUserId, deviceId: sessionDeviceId } = storeToRefs(useSessionStore())
        watch(() => sessionUserId, () => userId.value = sessionUserId.value, { immediate: true })
        watch(() => sessionDeviceId, () => deviceId.value = sessionDeviceId.value, { immediate: true })
    }
    initialize()

    // Used to encrypt the secret storage key. @/composables/crypto-keys.ts populates this field on initialization.
    const userDevicePickleKey = ref<Uint8Array | undefined>()
    const crossSigningMasterKey = ref<Uint8Array | undefined>()
    const crossSigningUserSigningKey = ref<Uint8Array | undefined>()
    const crossSigningSelfSigningKey = ref<Uint8Array | undefined>()

    // Room ID -> Session ID -> Sender Key -> Key Info
    const roomKeys = ref<Record<string, Record<string, Record<string, EventForwardedRoomKeyContent>>>>({})

    const identityVerificationRequired = computed<boolean>(() => {
        return (
            secretKeyIdsMissing.value.length > 0
            && (!crossSigningMasterKey.value || !crossSigningUserSigningKey.value || !crossSigningSelfSigningKey.value)
        )
    })

    onTabMessage((message) => {
        if (message.type === 'populateRoomKeysFromMegolmBackup') {
            populateRoomKeysFromMegolmBackupDirect(message.data)
        }
    })

    function populateRoomKeysFromMegolmBackupDirect(megolmBackup: any[], isBroadcaster: boolean = false) {
        for (const backupEvent of megolmBackup) {
            const roomId: string = backupEvent.room_id
            if (!roomId) continue
            if (!roomKeys.value[roomId]) {
                roomKeys.value[roomId] = {}
            }

            const sessionId: string = backupEvent.session_id
            if (!sessionId) continue
            if (!roomKeys.value[roomId][sessionId]) {
                roomKeys.value[roomId][sessionId] = {}
            }

            const senderKey: string = backupEvent.sender_key
            if (!senderKey) continue
            const event: EventForwardedRoomKeyContent = {
                algorithm: backupEvent.algorithm ?? '',
                forwardingCurve25519KeyChain: backupEvent.forwarding_curve25519_key_chain ?? [],
                roomId,
                senderClaimedEd25519Key: backupEvent.sender_claimed_keys?.ed25519 ?? '',
                senderKey,
                sessionId,
                sessionKey: backupEvent.session_key,
            }
            roomKeys.value[roomId][sessionId][senderKey] = event

            if (isBroadcaster) {
                try {
                    encryptSecret(
                        userDevicePickleKey.value!,
                        JSON.stringify(event),
                        `${roomId},${sessionId},${senderKey}`,
                    ).then((encryptedData) => {
                        saveDiscortixTableKey('roomKeys', [roomId, sessionId, senderKey], encryptedData)
                    })
                } catch (error) { /* Ignore */ }
            }
        }
    }

    function populateRoomKeysFromMegolmBackup(megolmBackup: any[]) {
        populateRoomKeysFromMegolmBackupDirect(megolmBackup, true)

        broadcastMessageFromTab({
            type: 'populateRoomKeysFromMegolmBackup',
            data: megolmBackup,
        })
    }

    function addRoomKeyInMemory(eventContent: EventForwardedRoomKeyContent) {
        const roomId: string = eventContent.roomId
        if (!roomId) return
        if (!roomKeys.value[roomId]) {
            roomKeys.value[roomId] = {}
        }

        const sessionId: string = eventContent.sessionId
        if (!sessionId) return
        if (!roomKeys.value[roomId][sessionId]) {
            roomKeys.value[roomId][sessionId] = {}
        }

        const senderKey: string = eventContent.senderKey
        if (!senderKey) return
        roomKeys.value[roomId][sessionId][senderKey] = eventContent
    }

    return {
        encryptionNotSupported,
        roomKeyLoadFailed,
        signingKeysValidationFailed,
        signingKeysUploadFailed,
        secretKeyIdsMissing,
        vodozemacInitFailed,
        userDevicePickleKey,
        crossSigningMasterKey,
        crossSigningUserSigningKey,
        crossSigningSelfSigningKey,
        roomKeys: computed(() => roomKeys.value),
        addRoomKeyInMemory,
        identityVerificationRequired,
        populateRoomKeysFromMegolmBackup,
    }
})