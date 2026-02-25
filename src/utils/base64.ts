
export interface Uint8ArrayToBase64Options {
    alphabet?: 'base64' | 'base64url';
    omitPadding?: boolean;
}

export interface Uint8ArrayFromBase64Options {
    alphabet?: 'base64';
    lastChunkHandling?: 'loose';
}

function toBase64(uint8Array: Uint8Array, options: Uint8ArrayToBase64Options): string {
    if ((typeof uint8Array as any).toBase64 === "function") {
        return (uint8Array as any).toBase64(options)
    }

    let base64 = btoa(uint8Array.reduce((acc, current) => acc + String.fromCharCode(current), ""))
    if (options.omitPadding) {
        base64 = base64.replace(/={1,2}$/, "")
    }
    if (options.alphabet === "base64url") {
        base64 = base64.replace(/\+/g, "-").replace(/\//g, "_")
    }

    return base64
}

export function encodeBase64(uint8Array: Uint8Array): string {
    return toBase64(uint8Array, { alphabet: "base64", omitPadding: false })
}

export function encodeUnpaddedBase64(uint8Array: Uint8Array): string {
    return toBase64(uint8Array, { alphabet: "base64", omitPadding: true })
}

function fromBase64(base64: string, options: Uint8ArrayFromBase64Options): Uint8Array {
    if (typeof (Uint8Array as any).fromBase64 === "function") {
        return (Uint8Array as any).fromBase64(base64, options)
    }
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

export function decodeBase64(base64: string): Uint8Array {
    return fromBase64(base64.replace(/-/g, "+").replace(/_/g, "/"), { alphabet: "base64", lastChunkHandling: "loose" })
}

// export function decodeUnpaddedBase64(b64url: string): Uint8Array {
//     let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
//     const padNeeded = (4 - (b64.length % 4)) % 4
//     if (padNeeded) b64 += "=".repeat(padNeeded)
//     const binary = atob(b64)
//     const out = new Uint8Array(binary.length)
//     for (let i = 0; i < binary.length; ++i) out[i] = binary.charCodeAt(i)
//     return out
// }

export function decodeUnpaddedBase64(input: string): Uint8Array {
    if (typeof input !== 'string') {
        throw new TypeError('Expected base64 string')
    }

    // Matrix uses standard base64 (NOT base64url)
    if (/[^A-Za-z0-9+/]/.test(input)) {
        throw new Error('Invalid base64 characters')
    }

    // Base64 length mod 4 must not be 1
    const remainder = input.length % 4
    if (remainder === 1) {
        throw new Error('Invalid base64 length')
    }

    // Restore padding
    const padded =
        remainder === 0
            ? input
            : input + '='.repeat(4 - remainder)

    const binary = atob(padded)
    const output = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i++) {
        output[i] = binary.charCodeAt(i)
    }

    return output
}

export function decodeMatrixBase64(input: string): Uint8Array {
    if (typeof input !== 'string') {
        throw new TypeError('Expected base64 string')
    }

    // Must be standard base64 (Matrix does not use base64url here)
    if (/[^A-Za-z0-9+/=]/.test(input)) {
        throw new Error('Invalid base64 characters')
    }

    // If already padded, leave it alone
    const remainder = input.length % 4
    if (remainder === 1) {
        throw new Error('Invalid base64 length')
    }

    const padded =
        remainder === 0
            ? input
            : input + '='.repeat(4 - remainder)

    const binary = atob(padded)
    const out = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i++) {
        out[i] = binary.charCodeAt(i)
    }

    return out
}