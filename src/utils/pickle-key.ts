import { loadTableKey, saveTableKey, deleteTableKey } from '@/stores/database/matrix-react-sdk'
import { encodeUnpaddedBase64 } from '@/utils/base64'

import type { EncryptedPickleKey } from '@/types'

function getPickleAdditionalData(userId: string, deviceId: string): Uint8Array {
    const additionalData = new Uint8Array(userId.length + deviceId.length + 1)
    for (let i = 0; i < userId.length; i++) {
        additionalData[i] = userId.charCodeAt(i)
    }
    additionalData[userId.length] = 124; // '|'
    for (let i = 0; i < deviceId.length; i++) {
        additionalData[userId.length + 1 + i] = deviceId.charCodeAt(i)
    }
    return additionalData
}

async function buildAndEncodePickleKey(
    data: EncryptedPickleKey | undefined,
    userId: string,
    deviceId: string,
): Promise<string | undefined> {
    if (!crypto?.subtle) {
        return undefined;
    }
    if (!data || !data.encrypted || !data.iv || !data.cryptoKey) {
        return undefined;
    }

    try {
        const additionalData = getPickleAdditionalData(userId, deviceId)
        const pickleKeyBuf = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: data.iv, additionalData: additionalData as BufferSource },
            data.cryptoKey,
            data.encrypted,
        )

        if (pickleKeyBuf) {
            return encodeUnpaddedBase64(new Uint8Array(pickleKeyBuf))
        }
    } catch {}

    return undefined;
}

async function encryptPickleKey(
    pickleKey: Uint8Array,
    userId: string,
    deviceId: string,
): Promise<EncryptedPickleKey | undefined> {
    if (!crypto?.subtle) {
        return undefined;
    }
    const cryptoKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    const iv = new Uint8Array(32)
    crypto.getRandomValues(iv)

    const additionalData = getPickleAdditionalData(userId, deviceId)
    const encrypted = await crypto.subtle.encrypt({
        name: 'AES-GCM', iv, additionalData: additionalData as BufferSource
    }, cryptoKey, pickleKey as BufferSource)

    return { encrypted, iv, cryptoKey }
}

export async function getPickleKey(userId: string, deviceId: string): Promise<string | null> {
    let data: { encrypted?: BufferSource; iv?: BufferSource; cryptoKey?: CryptoKey } | undefined
    try {
        data = await loadTableKey('pickleKey', [userId, deviceId])
    } catch {}
    return (await buildAndEncodePickleKey(data, userId, deviceId)) ?? null
}

export async function createPickleKey(userId: string, deviceId: string): Promise<string | null> {
    const randomArray = new Uint8Array(32)
    crypto.getRandomValues(randomArray)
    const data = await encryptPickleKey(randomArray, userId, deviceId)
    if (data === undefined) {
        return null
    }

    try {
        await saveTableKey('pickleKey', [userId, deviceId], data)
    } catch (error) {
        return null;
    }
    return encodeUnpaddedBase64(randomArray);
}

export async function destroyPickleKey(userId: string, deviceId: string): Promise<void> {
    try {
        await deleteTableKey('pickleKey', [userId, deviceId])
    } catch {}
}
