import { stringify as canonicalJsonStringify } from '@/utils/canonical-json'
import {
    InboundGroupSession,
    // MegolmMessage,
} from 'vodozemac-wasm-bindings'

import { decodeBase64 } from './base64'
import { camelizeApiResponse } from '@/utils/zod'

import {
    eventContentSchemaByType,
    type EventRoomEncryptedContent, type EventForwardedRoomKeyContent,
    type EncryptedFile,
} from '@/types'

export interface Ed25519KeyPair {
    pair: CryptoKeyPair;
    publicKey: ArrayBuffer;
    privateKey: Uint8Array;
}

export async function generateEd25519Key(): Promise<Ed25519KeyPair> {
    const pair = await crypto.subtle.generateKey(
        { name: 'ED25519', namedCurve: 'ED25519' },
        true,
        ['sign', 'verify'],
    )

    const pubRaw = await crypto.subtle.exportKey('raw', pair.publicKey)
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey)

    // PKCS#8 (RFC 8410) ends with: 0x04 0x20 <seed>
    const der = new Uint8Array(pkcs8)
    const seed = der.slice(-34).slice(2) // strip 0x04 0x20

    return {
        pair,
        publicKey: pubRaw,
        privateKey: seed,
    }
}

export async function signWithEd25519Key(data: string, keyPair: CryptoKeyPair): Promise<ArrayBuffer> {
    return await crypto.subtle.sign(
        { name: 'ED25519' },
        keyPair.privateKey,
        new TextEncoder().encode(data),
    );
}

export async function createSigningJson(value: any, keyPair: CryptoKeyPair) {
    const canonicalJson = canonicalJsonStringify(value, ['signatures', 'unsigned'])
    return await signWithEd25519Key(canonicalJson, keyPair)
}

export async function decryptMegolmEvent<T = any>(
    eventContent: EventRoomEncryptedContent,
    roomKey: EventForwardedRoomKeyContent,
): Promise<T> {
    if (eventContent.algorithm !== 'm.megolm.v1.aes-sha2') {
        throw new Error('Unsupported algorithm.');
    }

    if (typeof eventContent.ciphertext !== 'string') {
        throw new Error('Megolm ciphertext must be a base64 string.');
    }

    if (eventContent.sessionId !== roomKey.sessionId) {
        throw new Error('Session ID mismatch.');
    }

    let decryptedMessage = ''

    const session = InboundGroupSession.import(
        roomKey.sessionKey
    )

    try {
        if (session.session_id !== roomKey.sessionId) {
            throw new Error('Imported session ID does not match')
        }

        const decrypted = session.decrypt(
            eventContent.ciphertext
        )

        const plaintextBytes = decrypted.plaintext

        decryptedMessage = new TextDecoder().decode(plaintextBytes)
    } finally {
        session.free();
    }

    if (decryptedMessage === '') {
        throw new Error('Decryption did not write a message.')
    }

    const decryptedMessageObject = camelizeApiResponse(JSON.parse(decryptedMessage))
    const schema = eventContentSchemaByType[decryptedMessageObject.type as keyof typeof eventContentSchemaByType]
    schema?.parse(decryptedMessageObject.content)

    return decryptedMessageObject
}

export async function decryptFile(
    encryptedData: Uint8Array,
    encryptedFileInfo: EncryptedFile,
    mimetype?: string,
): Promise<Blob> {
    const keyB64 = encryptedFileInfo.key.k
    const ivB64  = encryptedFileInfo.iv

    const keyBytes = decodeBase64(keyB64)
    const ivBytes  = decodeBase64(ivB64)

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes as never,
        { name: 'AES-CTR' },
        false,
        ['decrypt'],
    )

    const plainBuffer = await crypto.subtle.decrypt(
        {
            name: 'AES-CTR',
            counter: ivBytes as never,
            length: 64,
        },
        cryptoKey,
        encryptedData as never,
    )

    const mime = mimetype || 'application/octet-stream'
    return new Blob([plainBuffer], { type: mime })
}
