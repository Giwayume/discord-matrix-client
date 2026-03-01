import { encodeUnpaddedBase64, decodeBase64 } from '@/utils/base64'
import basex from '@/utils/base-x'

import type { AesHmacSha2EncryptedData, AesHmacSha2KeyDescription, AesHmacSha2KeyDescriptionPassphrase } from '@/types'

const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const base58 = basex(base58Alphabet)
const olmRecoveryKeyPrefix = [0x8b, 0x01]

const zeroSalt = new Uint8Array(8)

export async function generateSecretKey(): Promise<Uint8Array> {
    return crypto.getRandomValues(new Uint8Array(32))
}

export async function generateSecretKeyFromPassphrase(
    passphrase: string
): Promise<[Uint8Array, AesHmacSha2KeyDescriptionPassphrase]> {
    const iterations = 500000
    const bits = 256
    const saltBytes = 16

    const salt = crypto.getRandomValues(new Uint8Array(saltBytes))

    const passphraseKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveBits'],
    )

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt,
            iterations,
        },
        passphraseKey,
        bits,
    )

    const keyBytes = new Uint8Array(derivedBits)

    const passphraseDescription: AesHmacSha2KeyDescriptionPassphrase = {
        algorithm: 'm.pbkdf2',
        salt: encodeUnpaddedBase64(salt),
        iterations,
        ...(bits !== 256 ? { bits } : {}),
    };

    return [keyBytes, passphraseDescription]
}

export async function generateSecretKeyId() {
    const raw = crypto.getRandomValues(new Uint8Array(32))
    return encodeUnpaddedBase64(raw)
}

export async function createSecretKeyDescription(
    secret: Uint8Array,
    name?: string
): Promise<AesHmacSha2KeyDescription> {
    if (secret.length !== 32) throw new Error('Secret must be 32 bytes')

    const iv = crypto.getRandomValues(new Uint8Array(16))

    const hkdfKey = await crypto.subtle.importKey(
        'raw',
        secret as never,
        'HKDF',
        false,
        ['deriveBits']
    )

    const infoBytes = name ? new TextEncoder().encode(name) : new Uint8Array(0)

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: new Uint8Array(32),
            info: infoBytes,
        },
        hkdfKey,
        512,
    )

    const derived = new Uint8Array(derivedBits)
    const aesKeyBytes = derived.slice(0, 32)
    const macKeyBytes = derived.slice(32)

    const aesKey = await crypto.subtle.importKey(
        'raw',
        aesKeyBytes,
        { name: 'AES-CTR' },
        false,
        ['encrypt'],
    )

    const zeroData = new Uint8Array(32)

    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
            {
                name: 'AES-CTR',
                counter: iv,
                length: 64, // per spec
            },
            aesKey,
            zeroData
        )
    )

    const hmacKey = await crypto.subtle.importKey(
        'raw',
        macKeyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )

    const mac = new Uint8Array(
        await crypto.subtle.sign('HMAC', hmacKey, ciphertext)
    )

    const ivBase64 = btoa(String.fromCharCode(...iv))
    const macBase64 = btoa(String.fromCharCode(...mac))

    const description: AesHmacSha2KeyDescription = {
        algorithm: 'm.secret_storage.v1.aes-hmac-sha2',
        iv: ivBase64,
        mac: macBase64
    }

    if (name) {
        description.name = name
    }

    return description
}

export async function validateSecretKeyDescription(
    secret: Uint8Array,
    description: AesHmacSha2KeyDescription,
): Promise<boolean> {
    if (description.algorithm !== 'm.secret_storage.v1.aes-hmac-sha2') return false

    if (!description.iv || !description.mac) return false

    if (secret.length !== 32) return false

    const iv = decodeBase64(description.iv)
    const expectedMac = decodeBase64(description.mac)

    if (iv.length !== 16 || expectedMac.length !== 32) {
        return false
    }

    const hkdfKey = await crypto.subtle.importKey(
        'raw',
        secret as never,
        'HKDF',
        false,
        ['deriveBits'],
    )

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: new Uint8Array(32),
            info: description.name ? new TextEncoder().encode(description.name) : new Uint8Array(0),
        },
        hkdfKey,
        512,
    )

    const derived = new Uint8Array(derivedBits)
    const aesKeyBytes = derived.slice(0, 32)
    const macKeyBytes = derived.slice(32)

    const aesKey = await crypto.subtle.importKey(
        'raw',
        aesKeyBytes,
        { name: 'AES-CTR' },
        false,
        ['encrypt'],
    )

    const zeroData = new Uint8Array(32)

    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
            {
                name: 'AES-CTR',
                counter: iv as never,
                length: 64, // per spec workaround bit
            },
            aesKey,
            zeroData,
        ),
    )

    const hmacKey = await crypto.subtle.importKey(
        'raw',
        macKeyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    )

    const mac = new Uint8Array(
        await crypto.subtle.sign('HMAC', hmacKey, ciphertext),
    )

    let diff = 0
    for (let i = 0; i < 32; i++) {
        diff |= mac[i]! ^ expectedMac[i]!
    }
    return diff === 0
}

export async function deriveKeys(key: Uint8Array, name: string): Promise<[CryptoKey, CryptoKey]> {
    const hkdfkey = await globalThis.crypto.subtle.importKey('raw', key as BufferSource, { name: 'HKDF' }, false, ['deriveBits'])
    const keybits = await globalThis.crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            salt: zeroSalt,
            info: new TextEncoder().encode(name),
            hash: 'SHA-256',
        },
        hkdfkey,
        512,
    )

    const aesKey = keybits.slice(0, 32)
    const hmacKey = keybits.slice(32)

    const aesProm = globalThis.crypto.subtle.importKey('raw', aesKey, { name: 'AES-CTR' }, false, [
        'encrypt',
        'decrypt',
    ])

    const hmacProm = globalThis.crypto.subtle.importKey(
        'raw',
        hmacKey,
        {
            name: 'HMAC',
            hash: { name: 'SHA-256' },
        },
        false,
        ['sign', 'verify'],
    )

    return Promise.all([aesProm, hmacProm])
}

export async function pickleKeyToAesKey(pickleKey: string): Promise<Uint8Array> {
    const pickleKeyBuffer = new Uint8Array(pickleKey.length)
    for (let i = 0; i < pickleKey.length; i++) {
        pickleKeyBuffer[i] = pickleKey.charCodeAt(i)
    }
    const hkdfKey = await crypto.subtle.importKey('raw', pickleKeyBuffer, 'HKDF', false, ['deriveBits'])
    pickleKeyBuffer.fill(0)
    return new Uint8Array(
        await crypto.subtle.deriveBits(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: new Uint8Array(32),
                info: new Uint8Array(0),
            },
            hkdfKey,
            256,
        ),
    )
}

export async function decryptSecret(
    secretKey: Uint8Array,
    encrypted: AesHmacSha2EncryptedData,
    secretName: string,
    wipeSecretKey = false,
): Promise<string> {
    if (!encrypted || typeof encrypted === 'string') return `${encrypted}`

    const [aesKey, hmacKey] = await deriveKeys(secretKey, secretName)

    const ct  = decodeBase64(encrypted.ciphertext)
    const mac = decodeBase64(encrypted.mac)
    const ok = await crypto.subtle.verify({ name: 'HMAC' }, hmacKey, mac as BufferSource, ct as BufferSource)
    if (!ok) throw new Error(`Bad MAC for secret ${secretName}`)

    const ptBuf = await crypto.subtle.decrypt(
        { name: 'AES-CTR', counter: decodeBase64(encrypted.iv) as unknown as ArrayBuffer, length: 64 },
        aesKey,
        ct as BufferSource,
    )
    const plaintext = new TextDecoder().decode(ptBuf)
    if (wipeSecretKey) {
        secretKey.fill(0)
    }
    return plaintext
}

export async function encryptSecret(
    secretKey: Uint8Array,
    plaintext: string,
    secretName: string,
    wipeSecretKey = false,
): Promise<AesHmacSha2EncryptedData> {
    const [aesKey, hmacKey] = await deriveKeys(secretKey, secretName)
    const plaintextBuffer = new TextEncoder().encode(plaintext)
    const iv = crypto.getRandomValues(new Uint8Array(16))

    const cipherBuffer = await crypto.subtle.encrypt(
        {
            name: 'AES-CTR',
            counter: iv.buffer,
            length: 64,
        },
        aesKey,
        plaintextBuffer,
    )

    const macBuffer = await crypto.subtle.sign(
        { name: 'HMAC' },
        hmacKey,
        cipherBuffer,
    )

    if (wipeSecretKey) secretKey.fill(0);

    return {
        ciphertext: encodeUnpaddedBase64(new Uint8Array(cipherBuffer)),
        iv: encodeUnpaddedBase64(iv),
        mac: encodeUnpaddedBase64(new Uint8Array(macBuffer)),
    }
}

/** @see https://spec.matrix.org/v1.17/appendices/#cryptographic-key-representation */
export async function recoveryKeyStringToRawKey(recoveryKey: string): Promise<Uint8Array> {
    const clean = base58.decode(recoveryKey.replace(/\s+/g, ''))

    let parity = 0
    for (const b of clean) {
        parity ^= b
    }
    if (parity !== 0) {
        throw new Error('Incorrect parity')
    }

    for (let i = 0; i < olmRecoveryKeyPrefix.length; ++i) {
        if (clean[i] !== olmRecoveryKeyPrefix[i]) {
            throw new Error('Incorrect prefix')
        }
    }

    if (clean.length !== olmRecoveryKeyPrefix.length + 32 + 1) {
        throw new Error('Incorrect length')
    }

    return Uint8Array.from(clean.slice(olmRecoveryKeyPrefix.length, olmRecoveryKeyPrefix.length + 32))
}

/** @see https://spec.matrix.org/v1.17/appendices/#cryptographic-key-representation */
export function rawKeyToRecoveryKeyString(key: ArrayLike<number>): string | undefined {
    const buffer = new Uint8Array(olmRecoveryKeyPrefix.length + key.length + 1)
    buffer.set(olmRecoveryKeyPrefix, 0)
    buffer.set(key, olmRecoveryKeyPrefix.length)

    let parity = 0;
    for (let i = 0; i < buffer.length - 1; ++i) {
        parity ^= buffer[i]!
    }
    buffer[buffer.length - 1] = parity
    const base58key = base58.encode(buffer)

    return base58key.match(/.{1,4}/g)?.join(' ')
}
