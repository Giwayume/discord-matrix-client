import { computed, ref, toRaw, watch } from 'vue'
import { defineStore, storeToRefs } from 'pinia'

export const useCryptoKeysStore = defineStore('cryptoKeys', () => {

    const userId = ref<string | undefined>()
    const deviceId = ref<string | undefined>()

    // TODO - prompt user action based on these error scenarios
    const signingKeysValidationFailed = ref<boolean>(false)
    const signingKeysUploadFailed = ref<boolean>(false)
    const secretKeyIdsMissing = ref<string[]>([])

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

    const identityVerificationRequired = computed<boolean>(() => {
        return (
            secretKeyIdsMissing.value.length > 0
            && (!crossSigningMasterKey.value || !crossSigningUserSigningKey.value || !crossSigningSelfSigningKey.value)
        )
    })

    return {
        signingKeysValidationFailed,
        signingKeysUploadFailed,
        secretKeyIdsMissing,
        userDevicePickleKey,
        crossSigningMasterKey,
        crossSigningUserSigningKey,
        crossSigningSelfSigningKey,
        identityVerificationRequired,
    }
})