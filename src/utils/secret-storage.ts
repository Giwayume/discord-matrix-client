import { decodeBase64 } from '@/utils/base64'

import type { AesHmacSha2EncryptedData } from '@/types'

const zeroSalt = new Uint8Array(8);

async function deriveKeys(key: Uint8Array, name: string): Promise<[CryptoKey, CryptoKey]> {
    const hkdfkey = await globalThis.crypto.subtle.importKey("raw", key as BufferSource, { name: "HKDF" }, false, ["deriveBits"])
    const keybits = await globalThis.crypto.subtle.deriveBits(
        {
            name: "HKDF",
            salt: zeroSalt,
            info: new TextEncoder().encode(name),
            hash: "SHA-256",
        },
        hkdfkey,
        512,
    )

    const aesKey = keybits.slice(0, 32)
    const hmacKey = keybits.slice(32)

    const aesProm = globalThis.crypto.subtle.importKey("raw", aesKey, { name: "AES-CTR" }, false, [
        "encrypt",
        "decrypt",
    ])

    const hmacProm = globalThis.crypto.subtle.importKey(
        "raw",
        hmacKey,
        {
            name: "HMAC",
            hash: { name: "SHA-256" },
        },
        false,
        ["sign", "verify"],
    )

    return Promise.all([aesProm, hmacProm])
}

async function pickleKeyToAesKey(pickleKey: string): Promise<Uint8Array> {
    const pickleKeyBuffer = new Uint8Array(pickleKey.length)
    for (let i = 0; i < pickleKey.length; i++) {
        pickleKeyBuffer[i] = pickleKey.charCodeAt(i)
    }
    const hkdfKey = await crypto.subtle.importKey("raw", pickleKeyBuffer, "HKDF", false, ["deriveBits"])
    pickleKeyBuffer.fill(0)
    return new Uint8Array(
        await crypto.subtle.deriveBits(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt: new Uint8Array(32),
                info: new Uint8Array(0),
            },
            hkdfKey,
            256,
        ),
    )
}

export async function decryptAesHmacSha2EncryptedData(
    pickleKey: string | undefined,
    token: AesHmacSha2EncryptedData,
    tokenName: string,
): Promise<string> {
    if (!token || Object.prototype.toString.call(token) === '[object String]') {
        return token + ''
    }

    if (!pickleKey) {
        throw new Error(`Error decrypting secret ${tokenName}: no pickle key found.`)
    }

    const encryptionKey = await pickleKeyToAesKey(pickleKey)
    const [aesKey, hmacKey] = await deriveKeys(encryptionKey, tokenName)

    const ciphertext = decodeBase64(token.ciphertext)

    if (!(await globalThis.crypto.subtle.verify({ name: 'HMAC' }, hmacKey, decodeBase64(token.mac) as BufferSource, ciphertext as BufferSource))) {
        throw new Error(`Error decrypting secret ${name}: bad MAC`)
    }

    const plaintext = await globalThis.crypto.subtle.decrypt(
        {
            name: 'AES-CTR',
            counter: decodeBase64(token.iv) as BufferSource,
            length: 64,
        },
        aesKey,
        ciphertext as BufferSource,
    )

    const decryptedToken = new TextDecoder().decode(new Uint8Array(plaintext))
    encryptionKey.fill(0)
    return decryptedToken
}
