
export interface EncryptedPickleKey {
    encrypted?: BufferSource;
    iv?: BufferSource;
    cryptoKey?: CryptoKey;
}

/**
 * @see https://spec.matrix.org/v1.11/client-server-api/#msecret_storagev1aes-hmac-sha2-1
 */
export interface AesHmacSha2EncryptedData {
    [key: string]: any; // extensible
    iv: string;
    ciphertext: string;
    mac: string;
}
