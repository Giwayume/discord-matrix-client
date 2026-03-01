import { useI18n, type ComposerTranslation } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import initVodozemacAsync from 'vodozemac-wasm-bindings'

import { createLogger } from '@/composables/logger'

import { decodeBase64, encodeUnpaddedBase64 } from '@/utils/base64'
import { generateEd25519Key, createSigningJson, type Ed25519KeyPair } from '@/utils/crypto'
import { HttpError, EncryptionNotSupportedError, EncryptionVerificationError } from '@/utils/error'
import { fetchJson } from '@/utils/fetch'
import { createPickleKey, getPickleKey } from '@/utils/pickle-key'
import { allSettledValues } from '@/utils/promise'
import {
    recoveryKeyStringToRawKey,
    decryptSecret, encryptSecret,
    generateSecretKeyId, createSecretKeyDescription, validateSecretKeyDescription,
    generateSecretKey, pickleKeyToAesKey,
} from '@/utils/secret-storage'
import * as z from 'zod'

import { useAccountData } from './account-data'

import { getAllTableKeys as getAllDiscortixTableKeys, loadTableKey as loadDiscortixTableKey, saveTableKey as saveDiscortixTableKey } from '@/stores/database/discortix'
import { useAccountDataStore } from '@/stores/account-data'
import { useSessionStore } from '@/stores/session'
import { useCryptoKeysStore } from '@/stores/crypto-keys'

import {
    type AesHmacSha2EncryptedData,
    type AesHmacSha2KeyDescription, AesHmacSha2KeyDescriptionSchema,
    type SecretStorageAccountData, SecretStorageAccountDataSchema,
    type ApiV3KeysQueryRequest, type ApiV3KeysQueryResponse, ApiV3KeysQueryResponseSchema,
    type ApiV3KeysUploadRequest, type ApiV3KeysUploadResponse, ApiV3KeysUploadResponseSchema,
    type ApiV3KeysDeviceSigningUploadRequest,
    type EventForwardedRoomKeyContent,
} from '@/types'

const log = createLogger(import.meta.url)

function getFriendlyErrorMessage(t: ComposerTranslation, error: Error | unknown) {
    console.error(error)
    if (error instanceof EncryptionNotSupportedError) {
        return t('errors.cryptoKeys.encryptionNotSupported')
    } else if (error instanceof EncryptionVerificationError) {
        return t('errors.cryptoKeys.encryptionVerificationFailed')
    } else if (error instanceof HttpError) {
        return t('errors.cryptoKeys.httpError')
    } else if (error instanceof z.ZodError) {
        return t('errors.cryptoKeys.schemaValidation')
    }
    return t('errors.unexpected')
}

export function useCryptoKeys() {
    const { t } = useI18n()
    const { getAccountDataByType, setAccountDataByType } = useAccountData()
    const {
        homeserverBaseUrl,
        userId,
        deviceId,
        accessToken,
        decryptedAccessToken,
        refreshToken,
        decryptedRefreshToken,
    } = storeToRefs(useSessionStore())
    const { accountData } = storeToRefs(useAccountDataStore())
    const cryptoKeysStore = useCryptoKeysStore()
    const {
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
    } = storeToRefs(cryptoKeysStore)
    const { addRoomKeyInMemory } = cryptoKeysStore

    async function queryAuthenticatedUserKeys() {
        if (!userId.value) throw new DOMException('User ID not found. Cannot proceed.', 'NotFoundError')
        return fetchJson<ApiV3KeysQueryResponse>(
            `${homeserverBaseUrl.value}/_matrix/client/v3/keys/query`,
            {
                method: 'POST',
                body: JSON.stringify({
                    device_keys: {
                        [userId.value]: [],
                    },
                } satisfies ApiV3KeysQueryRequest),
                useAuthorization: true,
                jsonSchema: ApiV3KeysQueryResponseSchema,
            },
        )
    }

    async function uploadAuthenticatedUserDeviceSigningKeys(
        keys: {
            crossSigningMaster: Ed25519KeyPair,
            crossSigningSelfSigning: Ed25519KeyPair,
            crossSigningUserSigning: Ed25519KeyPair,
        }
    ) {
        if (!userId.value) throw new DOMException('User ID not found. Cannot proceed.', 'NotFoundError')

        const publicMasterKeyEncoded = encodeUnpaddedBase64(new Uint8Array(keys.crossSigningMaster.publicKey))
        const masterKey: ApiV3KeysDeviceSigningUploadRequest['master_key'] = {
            keys: {
                [`ed25519:${publicMasterKeyEncoded}`]: publicMasterKeyEncoded,
            },
            signatures: {
                [userId.value]: {}
            },
            usage: ['master'],
            user_id: userId.value,
        }
        masterKey.signatures[userId.value][`ed25519:${publicMasterKeyEncoded}`] = createSigningJson(masterKey, keys.crossSigningMaster.pair)

        const publicSelfSigningKeyEncoded = encodeUnpaddedBase64(new Uint8Array(keys.crossSigningSelfSigning.publicKey))
        const selfSigningKey: ApiV3KeysDeviceSigningUploadRequest['self_signing_key'] = {
            keys: {
                [`ed25519:${publicSelfSigningKeyEncoded}`]: publicSelfSigningKeyEncoded,
            },
            signatures: {
                [userId.value]: {}
            },
            usage: ['self_signing'],
            user_id: userId.value,
        }
        selfSigningKey.signatures[userId.value][`ed25519:${publicSelfSigningKeyEncoded}`] = createSigningJson(selfSigningKey, keys.crossSigningMaster.pair)

        const publicUserSigningKeyEncoded = encodeUnpaddedBase64(new Uint8Array(keys.crossSigningUserSigning.publicKey))
        const userSigningKey: ApiV3KeysDeviceSigningUploadRequest['user_signing_key'] = {
            keys: {
                [`ed25519:${publicUserSigningKeyEncoded}`]: publicUserSigningKeyEncoded,
            },
            signatures: {
                [userId.value]: {}
            },
            usage: ['user_signing'],
            user_id: userId.value,
        }
        userSigningKey.signatures[userId.value][`ed25519:${publicUserSigningKeyEncoded}`] = createSigningJson(userSigningKey, keys.crossSigningMaster.pair)

        return fetchJson<ApiV3KeysUploadResponse>(
            `${homeserverBaseUrl.value}/_matrix/client/v3/keys/device_signing/upload`,
            {
                method: 'POST',
                body: JSON.stringify({
                    master_key: masterKey,
                    self_signing_key: selfSigningKey,
                    user_signing_key: userSigningKey,
                } satisfies ApiV3KeysDeviceSigningUploadRequest),
                useAuthorization: true,
            },
        )
    }

    async function initialize() {
        if (!userId.value || !deviceId.value) throw new DOMException('User ID or Device ID not found. Cannot proceed.', 'NotFoundError')
            
        // Retrieve or generate a pickle key for secret storage.
        let pickleKeyString: string | null = null
        try {
            pickleKeyString = await getPickleKey(userId.value, deviceId.value)
        } catch (error) { /* Ignore - will generate a new one. */ }
        if (!pickleKeyString) {
            try {
                pickleKeyString = await createPickleKey(userId.value, deviceId.value)
            } catch (error) {
                log.error('Error when generating pickle key.', error)
                encryptionNotSupported.value = true
                return
            }
        }
        if (pickleKeyString) {
            try {
                userDevicePickleKey.value = await pickleKeyToAesKey(pickleKeyString)
            } catch (error) {
                log.error('Error when converting pickle key to AES key.', error)
                encryptionNotSupported.value = true
                return
            }
        }
        if (!userDevicePickleKey.value) {
            encryptionNotSupported.value = true
            return
        }

        // Convert string auth tokens to encrypted versions.
        if (typeof accessToken.value === 'string') {
            accessToken.value = await encryptSecret(userDevicePickleKey.value, accessToken.value, 'access_token')
        }
        if (typeof accessToken.value === 'object') {
            decryptedAccessToken.value = await decryptSecret(userDevicePickleKey.value, accessToken.value, 'access_token')
        }
        if (typeof refreshToken.value === 'string') {
            refreshToken.value = await encryptSecret(userDevicePickleKey.value, refreshToken.value, 'refresh_token')
        }
        if (typeof refreshToken.value === 'object') {
            decryptedRefreshToken.value = await decryptSecret(userDevicePickleKey.value, refreshToken.value, 'refresh_token')
        }

        try {
            await initVodozemacAsync({ module_or_path: '/assets/wasm/vodozemac_bg.wasm' })
        } catch (error) {
            vodozemacInitFailed.value = true
            log.error('Vodozemac initialization failed.', error)
        }

        // Fetch room keys from storage.
        try {
            const roomKeyTableKeys: string[][] = await getAllDiscortixTableKeys('roomKeys')
            const fetchPromises: Array<Promise<[string, string, string, EventForwardedRoomKeyContent]>> = []
            for (const [roomId, sessionId, senderKey] of roomKeyTableKeys) {
                if (!roomId || !sessionId || !senderKey) continue
                fetchPromises.push(
                    loadDiscortixTableKey('roomKeys', [roomId, sessionId, senderKey]).then(
                        async (encryptedData: AesHmacSha2EncryptedData) => ([
                            roomId,
                            sessionId,
                            senderKey,
                            JSON.parse(await decryptSecret(
                                userDevicePickleKey.value!,
                                encryptedData,
                                `${roomId},${sessionId},${senderKey}`,
                            )),
                        ])
                    )
                )
            }
            const settleResults = await Promise.allSettled(fetchPromises)
            for (const settleResult of settleResults) {
                if (settleResult.status === 'fulfilled') {
                    const [roomId, sessionId, senderKey, event] = settleResult.value
                    addRoomKeyInMemory(event)
                }
            }
        } catch (error) {
            log.error('An error occurred when loading room keys from storage.', error)
            roomKeyLoadFailed.value = true
        }
        
        // Try to retrieve keys from the account data and uploaded store.
        let [
            secretStorageDefaultKeyName,
            crossSigningMaster,
            crossSigningUserSigning,
            crossSigningSelfSigning,
        ] = await allSettledValues([
            getAccountDataByType<{ key: string }>('m.secret_storage.default_key'),
            getAccountDataByType<SecretStorageAccountData>('m.cross_signing.master', SecretStorageAccountDataSchema),
            getAccountDataByType<SecretStorageAccountData>('m.cross_signing.user_signing', SecretStorageAccountDataSchema),
            getAccountDataByType<SecretStorageAccountData>('m.cross_signing.self_signing', SecretStorageAccountDataSchema),
        ] as const)

        const uploadedKeys = await queryAuthenticatedUserKeys()

        // If no signing keys uploaded yet, create them and upload them.
        if (
            !uploadedKeys?.masterKeys?.[userId.value]
            || !uploadedKeys?.userSigningKeys?.[userId.value]
            || !uploadedKeys?.selfSigningKeys?.[userId.value]
        ) {
            const secretKey = await generateSecretKey()
            const secretKeyId = await generateSecretKeyId()
            const secretKeyDescription = await createSecretKeyDescription(secretKey, `m.secret_storage.key.${secretKeyId}`)

            const crossSigningMasterKeyPair = await generateEd25519Key()
            const crossSigningUserSigningKeyPair = await generateEd25519Key()
            const crossSigningSelfSigningKeyPair = await generateEd25519Key()
            const base64CrossSigningMasterPrivateKey = encodeUnpaddedBase64(new Uint8Array(crossSigningMasterKeyPair.privateKey))
            const base64CrossSigningUserSigningPrivateKey = encodeUnpaddedBase64(new Uint8Array(crossSigningUserSigningKeyPair.privateKey))
            const base64CrossSigningSelfSigningKeyPrivateKey = encodeUnpaddedBase64(new Uint8Array(crossSigningSelfSigningKeyPair.privateKey))

            const crossSigningMasterEncrypted = await encryptSecret(
                secretKey,
                base64CrossSigningMasterPrivateKey,
                'm.cross_signing.master',
            )
            const crossSigningUserSigningEncrypted = await encryptSecret(
                secretKey,
                base64CrossSigningUserSigningPrivateKey,
                'm.cross_signing.user_signing',
            )
            const crossSigningSelfSigningEncrypted = await encryptSecret(
                secretKey,
                base64CrossSigningSelfSigningKeyPrivateKey,
                'm.cross_signing.self_signing',
            )

            try {
                const crossSigningMasterDecrypted = await decryptSecret(
                    secretKey,
                    crossSigningMasterEncrypted,
                    'm.cross_signing.master'
                )
                const crossSigningUserSigningDecrypted = await decryptSecret(
                    secretKey,
                    crossSigningUserSigningEncrypted,
                    'm.cross_signing.user_signing'
                )
                const crossSigningSelfSigningDecrypted = await decryptSecret(
                    secretKey,
                    crossSigningSelfSigningEncrypted,
                    'm.cross_signing.self_signing'
                )
                if (
                    crossSigningMasterDecrypted !== base64CrossSigningMasterPrivateKey
                    || crossSigningUserSigningDecrypted !== base64CrossSigningUserSigningPrivateKey
                    || crossSigningSelfSigningDecrypted !== base64CrossSigningSelfSigningKeyPrivateKey
                ) {
                    throw new Error('Decrypted signing keys did not match encrypted counterparts.')
                }
            } catch (error) {
                log.error('Error when validating newly generated signing keys.', error)
                signingKeysValidationFailed.value = true
                return
            }

            secretStorageDefaultKeyName = {
                key: secretKeyId,
            }
            crossSigningMaster = {
                encrypted: {
                    [secretKeyId]: crossSigningMasterEncrypted,
                }
            }
            crossSigningUserSigning = {
                encrypted: {
                    [secretKeyId]: crossSigningUserSigningEncrypted,
                }
            }
            crossSigningSelfSigning = {
                encrypted: {
                    [secretKeyId]: crossSigningSelfSigningEncrypted,
                }
            }

            try {
                await uploadAuthenticatedUserDeviceSigningKeys({
                    crossSigningMaster: crossSigningMasterKeyPair,
                    crossSigningUserSigning: crossSigningUserSigningKeyPair,
                    crossSigningSelfSigning: crossSigningSelfSigningKeyPair,
                })

                await Promise.all([
                    setAccountDataByType('m.secret_storage.default_key', secretStorageDefaultKeyName),
                    setAccountDataByType(`m.secret_storage.key.${secretKeyId}`, secretKeyDescription),
                    setAccountDataByType('m.cross_signing.master', crossSigningMaster),
                    setAccountDataByType('m.cross_signing.user_signing', crossSigningUserSigning),
                    setAccountDataByType('m.cross_signing.self_signing', crossSigningSelfSigning),
                ])

                await saveDiscortixTableKey('4s', `${userId.value},${secretKeyId}`, encryptSecret(
                    userDevicePickleKey.value, encodeUnpaddedBase64(secretKey), `${userId.value}:${secretKeyId}`
                ))
            } catch (error) {
                log.error('Error when uploading newly generated signing keys.', error)
                signingKeysUploadFailed.value = true
            }
        }
        
        // Check which account keys need which secret storage key (if more than one).
        let neededKeys = new Set<string>()
        if (secretStorageDefaultKeyName?.key) {
            neededKeys.add(secretStorageDefaultKeyName?.key)
        }
        if (crossSigningMaster?.encrypted) {
            for (const keyname in crossSigningMaster.encrypted) {
                neededKeys.add(keyname)
            }
        }
        if (crossSigningUserSigning?.encrypted) {
            for (const keyname in crossSigningUserSigning.encrypted) {
                neededKeys.add(keyname)
            }
        }
        if (crossSigningSelfSigning?.encrypted) {
            for (const keyname in crossSigningSelfSigning.encrypted) {
                neededKeys.add(keyname)
            }
        }

        const keyDescriptions = (await allSettledValues(
            Array.from(neededKeys).map((keyId) => {
                return getAccountDataByType<AesHmacSha2KeyDescription>(
                    `m.secret_storage.key.${keyId}`, AesHmacSha2KeyDescriptionSchema
                ).then((result) => ({ id: keyId, description: result }))
            })
        ))

        // Retrieve secret keys from storage
        const secretKeys: Record<string, Uint8Array> = {}
        for (const keyId of Array.from(neededKeys)) {
            try {
                const secretKey = decodeBase64(
                    await decryptSecret(
                        userDevicePickleKey.value,
                        await loadDiscortixTableKey('4s', `${userId.value},${keyId}`),
                        `${userId.value}:${keyId}`,
                    )
                )
                const keyDescription = keyDescriptions.find((description) => description?.id === keyId)
                if (keyDescription?.description && await validateSecretKeyDescription(secretKey, keyDescription.description)) {
                    secretKeys[keyId] = secretKey
                }
            } catch (error) { /* Ignore */ }
        }
        const ownedSecretKeyIds = Object.keys(secretKeys)

        // Retrieve signing private keys
        for (const keyId of ownedSecretKeyIds) {
            if (crossSigningMaster?.encrypted[keyId]) {
                try {
                    crossSigningMasterKey.value = decodeBase64(
                        await decryptSecret(secretKeys[keyId]!, crossSigningMaster.encrypted[keyId], 'm.cross_signing.master')
                    )
                } catch (error) { /* Ignore */ }
            }
            if (crossSigningUserSigning?.encrypted[keyId]) {
                try {
                    crossSigningUserSigningKey.value = decodeBase64(
                        await decryptSecret(secretKeys[keyId]!, crossSigningUserSigning.encrypted[keyId], 'm.cross_signing.user_signing')
                    )
                } catch (error) { /* Ignore */ }
            }
            if (crossSigningSelfSigning?.encrypted[keyId]) {
                try {
                    crossSigningSelfSigningKey.value = decodeBase64(
                        await decryptSecret(secretKeys[keyId]!, crossSigningSelfSigning.encrypted[keyId], 'm.cross_signing.self_signing')
                    )
                } catch (error) { /* Ignore */ }
            }
        }

        // Determine which secret keys are missing if failed to retrieve any of the private signing keys.
        const missingKeyIdSet = new Set<string>()
        if (!crossSigningMasterKey.value) {
            for (const keyId in crossSigningMaster?.encrypted) {
                if (!ownedSecretKeyIds.includes(keyId)) {
                    missingKeyIdSet.add(keyId)
                }
            }
        }
        if (!crossSigningUserSigningKey.value) {
            for (const keyId in crossSigningUserSigning?.encrypted) {
                if (!ownedSecretKeyIds.includes(keyId)) {
                    missingKeyIdSet.add(keyId)
                }
            }
        }
        if (!crossSigningSelfSigningKey.value) {
            for (const keyId in crossSigningSelfSigning?.encrypted) {
                if (!ownedSecretKeyIds.includes(keyId)) {
                    missingKeyIdSet.add(keyId)
                }
            }
        }
        secretKeyIdsMissing.value = Array.from(missingKeyIdSet)
    }

    async function installSecretKey(keyId: string, secretKey: Uint8Array) {
        const keyDescription: AesHmacSha2KeyDescription = accountData.value[`m.secret_storage.key.${keyId}`]
        if (!keyDescription) throw new EncryptionVerificationError()
        try {
            const isValid = await validateSecretKeyDescription(secretKey, keyDescription)
            if (!isValid) throw new EncryptionVerificationError() 
        } catch (error) {
            throw new EncryptionVerificationError()
        }

        await saveDiscortixTableKey('4s', `${userId.value},${keyId}`, await encryptSecret(
            userDevicePickleKey.value!,
            encodeUnpaddedBase64(secretKey),
            `${userId.value}:${keyId}`,
        ))
        secretKeyIdsMissing.value.splice(secretKeyIdsMissing.value.indexOf(keyId), 1)

        let [
            crossSigningMaster,
            crossSigningUserSigning,
            crossSigningSelfSigning,
        ] = await allSettledValues([
            getAccountDataByType<SecretStorageAccountData>('m.cross_signing.master', SecretStorageAccountDataSchema),
            getAccountDataByType<SecretStorageAccountData>('m.cross_signing.user_signing', SecretStorageAccountDataSchema),
            getAccountDataByType<SecretStorageAccountData>('m.cross_signing.self_signing', SecretStorageAccountDataSchema),
        ] as const)

        if (crossSigningMaster?.encrypted[keyId]) {
            try {
                crossSigningMasterKey.value = decodeBase64(
                    await decryptSecret(secretKey, crossSigningMaster.encrypted[keyId], 'm.cross_signing.master')
                )
            } catch (error) { /* Ignore */ }
        }
        if (crossSigningUserSigning?.encrypted[keyId]) {
            try {
                crossSigningUserSigningKey.value = decodeBase64(
                    await decryptSecret(secretKey, crossSigningUserSigning.encrypted[keyId], 'm.cross_signing.user_signing')
                )
            } catch (error) { /* Ignore */ }
        }
        if (crossSigningSelfSigning?.encrypted[keyId]) {
            try {
                crossSigningSelfSigningKey.value = decodeBase64(
                    await decryptSecret(secretKey, crossSigningSelfSigning.encrypted[keyId], 'm.cross_signing.self_signing')
                )
            } catch (error) { /* Ignore */ }
        }
    }

    async function installRecoveryKey(keyId: string, recoveryKey: string) {
        const secretKey = await recoveryKeyStringToRawKey(recoveryKey)
        return installSecretKey(keyId, secretKey)
    }
    
    return {
        getFriendlyErrorMessage: (error: Error | unknown) => getFriendlyErrorMessage(t, error),
        initialize,
        installRecoveryKey,
    }
}
