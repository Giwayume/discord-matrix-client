import { computed, ref, toRaw, watch } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import type { Account, Session } from 'vodozemac-wasm-bindings'

import { useBroadcast } from '@/composables/broadcast'

import { saveTableKey as saveDiscortixTableKey } from '@/stores/database/discortix'

import { encryptSecret } from '@/utils/secret-storage'

import { onLogout } from '@/composables/logout'

import type {
    ApiV3DeviceInformation,
    ApiV3KeysQueryResponse,
    ApiV3CrossSigningKey,
    ApiV3SyncClientEventWithoutRoomId,
    EventRoomEncryptedContent,
    EventForwardedRoomKeyContent,
} from '@/types'

export const useCryptoKeysStore = defineStore('cryptoKeys', () => {
    const { onTabMessage, broadcastMessageFromTab } = useBroadcast({ permanent: true })

    const userId = ref<string | undefined>()
    const deviceId = ref<string | undefined>()

    // TODO - prompt user action based on these error scenarios
    const encryptionNotSupported = ref<boolean>(false)
    const roomKeyLoadFailed = ref<boolean>(false)
    const signingKeysValidationFailed = ref<boolean>(false)
    const signingKeysUploadFailed = ref<boolean>(false)
    const secretKeyIdsMissing = ref<string[]>([])
    const vodozemacInitFailed = ref<boolean>(false)
    const deviceKeyUploadFailed = ref<boolean>(false)

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

    const olmAccount = ref<Account | undefined>()

    // User ID -> Device ID -> Key Info
    const deviceKeys = ref<Record<string, Record<string, ApiV3DeviceInformation>>>({})

    // User ID -> Key Info
    const userSigningKeys = ref<Record<
        string,
        { masterKeys?: ApiV3CrossSigningKey, selfSigningKeys?: ApiV3CrossSigningKey, userSigningKeys?: ApiV3CrossSigningKey }
    >>({})

    // Room ID -> Session ID -> Sender Key -> Key Info
    const roomKeys = ref<Record<string, Record<string, Record<string, EventForwardedRoomKeyContent>>>>({})

    // `${userId}:${receiverDeviceCurveKey}:${algorithm}` -> Session
    const outboundOlmSessions = ref<Record<string, Session>>({})

    // `${userId}:${senderDeviceCurveKey}:${algorithm}` -> Message
    const inboundDeviceEncryptedMessages = ref<Record<string, ApiV3SyncClientEventWithoutRoomId<EventRoomEncryptedContent>[]>>({})

    // `${userId}:${senderDeviceCurveKey}:${algorithm}` -> Session
    const inboundOlmSessions = ref<Record<string, Session>>({})

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

    function populateKeysFromApiV3KeysQueryResponse(query: ApiV3KeysQueryResponse) {
        if (query.deviceKeys) {
            for (const otherUserId in query.deviceKeys) {
                if (!deviceKeys.value[otherUserId]) {
                    deviceKeys.value[otherUserId] = {}
                }
                for (const otherDeviceId in query.deviceKeys[otherUserId]) {
                    deviceKeys.value[otherUserId][otherDeviceId] = query.deviceKeys[otherUserId][otherDeviceId]!
                }
            }
        }
        if (query.masterKeys) {
            for (const otherUserId in query.masterKeys) {
                if (!userSigningKeys.value[otherUserId]) {
                    userSigningKeys.value[otherUserId] = {}
                }
                userSigningKeys.value[otherUserId].masterKeys = query.masterKeys[otherUserId]
            }
        }
        if (query.selfSigningKeys) {
            for (const otherUserId in query.selfSigningKeys) {
                if (!userSigningKeys.value[otherUserId]) {
                    userSigningKeys.value[otherUserId] = {}
                }
                userSigningKeys.value[otherUserId].selfSigningKeys = query.selfSigningKeys[otherUserId]
            }
        }
        if (query.userSigningKeys) {
            for (const otherUserId in query.userSigningKeys) {
                if (!userSigningKeys.value[otherUserId]) {
                    userSigningKeys.value[otherUserId] = {}
                }
                userSigningKeys.value[otherUserId].userSigningKeys = query.userSigningKeys[otherUserId]
            }
        }
    }

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

    onLogout(() => {
        encryptionNotSupported.value = false
        roomKeyLoadFailed.value = false
        signingKeysValidationFailed.value = false
        signingKeysUploadFailed.value = false
        secretKeyIdsMissing.value = []
        vodozemacInitFailed.value = false
        deviceKeyUploadFailed.value = false

        userDevicePickleKey.value = undefined
        crossSigningMasterKey.value = undefined
        crossSigningUserSigningKey.value = undefined
        crossSigningSelfSigningKey.value = undefined

        olmAccount.value = undefined
        outboundOlmSessions.value = {}
        inboundDeviceEncryptedMessages.value = {}
        inboundOlmSessions.value = {}
    }, { permanent: true })

    return {
        encryptionNotSupported,
        roomKeyLoadFailed,
        signingKeysValidationFailed,
        signingKeysUploadFailed,
        secretKeyIdsMissing,
        vodozemacInitFailed,
        deviceKeyUploadFailed,
        userDevicePickleKey,
        crossSigningMasterKey,
        crossSigningUserSigningKey,
        crossSigningSelfSigningKey,
        olmAccount,
        outboundOlmSessions,
        inboundOlmSessions,
        inboundDeviceEncryptedMessages,
        deviceKeys: computed(() => deviceKeys.value),
        userSigningKeys: computed(() => userSigningKeys.value),
        roomKeys: computed(() => roomKeys.value),
        addRoomKeyInMemory,
        identityVerificationRequired,
        populateKeysFromApiV3KeysQueryResponse,
        populateRoomKeysFromMegolmBackup,
    }
})