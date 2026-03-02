
export interface Uint8ArrayToBase64Options {
    alphabet?: 'base64' | 'base64url';
    omitPadding?: boolean;
}

export interface Uint8ArrayFromBase64Options {
    alphabet?: 'base64';
    lastChunkHandling?: 'loose';
}

function toBase64(uint8Array: Uint8Array, options: Uint8ArrayToBase64Options): string {
    if ((typeof uint8Array as any).toBase64 === 'function') {
        return (uint8Array as any).toBase64(options)
    }

    let base64 = btoa(uint8Array.reduce((acc, current) => acc + String.fromCharCode(current), ''))
    if (options.omitPadding) {
        base64 = base64.replace(/={1,2}$/, '')
    }
    if (options.alphabet === 'base64url') {
        base64 = base64.replace(/\+/g, '-').replace(/\//g, '_')
    }

    return base64
}

export function encodeBase64(uint8Array: Uint8Array): string {
    return toBase64(uint8Array, { alphabet: 'base64', omitPadding: false })
}

export function encodeUnpaddedBase64(uint8Array: Uint8Array): string {
    return toBase64(uint8Array, { alphabet: 'base64', omitPadding: true })
}

function fromBase64(base64: string, options: Uint8ArrayFromBase64Options): Uint8Array {
    if (typeof (Uint8Array as any).fromBase64 === 'function') {
        return (Uint8Array as any).fromBase64(base64, options)
    }
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

export function decodeBase64(base64: string): Uint8Array {
    return fromBase64(base64.replace(/-/g, '+').replace(/_/g, '/'), { alphabet: 'base64', lastChunkHandling: 'loose' })
}
