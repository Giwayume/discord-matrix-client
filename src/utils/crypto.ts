import { stringify as canonicalJsonStringify } from '@/utils/canonical-json'

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
