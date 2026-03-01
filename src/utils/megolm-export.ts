import { InvalidFileError } from '@/utils/error'

const exportHeaderLine = '-----BEGIN MEGOLM SESSION DATA-----'
const exportFooterLine = '-----END MEGOLM SESSION DATA-----'

async function deriveKeys(salt: Uint8Array, iterations: number, password: string): Promise<[CryptoKey, CryptoKey]> {
    const key = await window.crypto.subtle.importKey(
        'raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, [ 'deriveBits', ]
    )

    const keybits = await window.crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt as never,
            iterations: iterations,
            hash: 'SHA-512',
        },
        key,
        512,
    )

    const aesKey = keybits.slice(0, 32)
    const hmacKey = keybits.slice(32)

    const aesProm = window.crypto.subtle.importKey('raw', aesKey, { name: 'AES-CTR' }, false, ['encrypt', 'decrypt'])

    const hmacProm = window.crypto.subtle.importKey(
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

export async function encryptMegolmKeyFile(
    data: string,
    password: string,
    options?: { kdf_rounds?: number },
): Promise<ArrayBuffer> {
    options = options || {}
    const kdfRounds = options.kdf_rounds || 500000

    const salt = new Uint8Array(16)
    window.crypto.getRandomValues(salt)

    const iv = new Uint8Array(16)
    window.crypto.getRandomValues(iv)

    // Clear bit 63 of the IV to stop us hitting the 64-bit counter boundary
    // (which would mean we wouldn't be able to decrypt on Android). The loss
    // of a single bit of iv is a price we have to pay.
    iv[8]! &= 0x7f;

    const [aesKey, hmacKey] = await deriveKeys(salt, kdfRounds, password)
    const encodedData = new TextEncoder().encode(data)

    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: "AES-CTR",
            counter: iv,
            length: 64,
        },
        aesKey,
        encodedData,
    )

    const cipherArray = new Uint8Array(ciphertext)
    const bodyLength = 1 + salt.length + iv.length + 4 + cipherArray.length + 32
    const resultBuffer = new Uint8Array(bodyLength)
    let idx = 0
    resultBuffer[idx++] = 1 // version
    resultBuffer.set(salt, idx)
    idx += salt.length
    resultBuffer.set(iv, idx)
    idx += iv.length
    resultBuffer[idx++] = kdfRounds >> 24
    resultBuffer[idx++] = (kdfRounds >> 16) & 0xff
    resultBuffer[idx++] = (kdfRounds >> 8) & 0xff
    resultBuffer[idx++] = kdfRounds & 0xff
    resultBuffer.set(cipherArray, idx)
    idx += cipherArray.length

    const toSign = resultBuffer.subarray(0, idx)

    const hmac = await window.crypto.subtle.sign({ name: "HMAC" }, hmacKey, toSign)

    const hmacArray = new Uint8Array(hmac)
    resultBuffer.set(hmacArray, idx)
    return packMegolmKeyFile(resultBuffer)
}

export async function decryptMegolmKeyFile(data: ArrayBuffer, password: string): Promise<string> {
    const body = unpackMegolmKeyFile(data)

    const version = body[0]
    if (version !== 1) {
        throw new InvalidFileError('Unsupported file version.')
    }

    const ciphertextLength = body.length - (1 + 16 + 16 + 4 + 32)
    if (ciphertextLength < 0) {
        throw new InvalidFileError('File too short')
    }

    const salt = body.subarray(1, 1 + 16)
    const iv = body.subarray(17, 17 + 16)
    const iterations = (body[33]! << 24) | (body[34]! << 16) | (body[35]! << 8) | body[36]!
    const ciphertext = body.subarray(37, 37 + ciphertextLength)
    const hmac = body.subarray(-32)

    const [aesKey, hmacKey] = await deriveKeys(salt, iterations, password)
    const toVerify = body.subarray(0, -32)

    const isValid = await window.crypto.subtle.verify({ name: 'HMAC' }, hmacKey, hmac as never, toVerify as never)
    if (!isValid) {
        throw new Error('HMAC mismatch.')
    }

    const plaintext = await window.crypto.subtle.decrypt(
        {
            name: 'AES-CTR',
            counter: iv as never,
            length: 64,
        },
        aesKey,
        ciphertext as never,
    )

    return new TextDecoder().decode(new Uint8Array(plaintext))
}

function unpackMegolmKeyFile(data: ArrayBuffer): Uint8Array {
    const fileText = new TextDecoder().decode(new Uint8Array(data))

    let lineStart = 0
    while (1) {
        const lineEnd = fileText.indexOf('\n', lineStart)
        if (lineEnd < 0) {
            throw new InvalidFileError('Header line not found')
        }
        const line = fileText.slice(lineStart, lineEnd).trim()

        lineStart = lineEnd + 1

        if (line === exportHeaderLine) {
            break
        }
    }

    const dataStart = lineStart

    while (1) {
        const lineEnd = fileText.indexOf('\n', lineStart)
        const line = fileText.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).trim()
        if (line === exportFooterLine) {
            break
        }

        if (lineEnd < 0) {
            throw new InvalidFileError('Footer line not found')
        }

        lineStart = lineEnd + 1
    }

    const dataEnd = lineStart
    return decodeBase64(fileText.slice(dataStart, dataEnd))
}

function packMegolmKeyFile(data: Uint8Array): ArrayBuffer {
    const LINE_LENGTH = (72 * 4) / 3
    const nLines = Math.ceil(data.length / LINE_LENGTH)
    const lines = new Array(nLines + 3)
    lines[0] = exportHeaderLine
    let o = 0
    let i
    for (i = 1; i <= nLines; i++) {
        lines[i] = encodeBase64(data.subarray(o, o + LINE_LENGTH))
        o += LINE_LENGTH
    }
    lines[i++] = exportFooterLine
    lines[i] = ''
    return new TextEncoder().encode(lines.join('\n')).buffer
}

function encodeBase64(uint8Array: Uint8Array): string {
    const latin1String = String.fromCharCode.apply(null, Array.from(uint8Array))
    return window.btoa(latin1String)
}

function decodeBase64(base64: string): Uint8Array {
    const latin1String = window.atob(base64)
    const uint8Array = new Uint8Array(latin1String.length)
    for (let i = 0; i < latin1String.length; i++) {
        uint8Array[i] = latin1String.charCodeAt(i)
    }
    return uint8Array
}
