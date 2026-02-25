import * as z from 'zod'
import { camelizeSchema, camelizeSchemaWithoutTransform } from '@/utils/zod'

export interface EncryptedPickleKey {
    encrypted?: BufferSource;
    iv?: BufferSource;
    cryptoKey?: CryptoKey;
}

/**
 * @see https://spec.matrix.org/v1.11/client-server-api/#msecret_storagev1aes-hmac-sha2-1
 */
export const AesHmacSha2EncryptedDataSchema = z.object({
    iv: z.string(),
    ciphertext: z.string(),
    mac: z.string(),
})
export interface AesHmacSha2EncryptedData {
    iv: string;
    ciphertext: string;
    mac: string;
    [key: string]: any; // extensible
}

export const AesHmacSha2KeyDescriptionPassphraseSchema = z.object({
    algorithm: z.enum(['m.pbkdf2']),
    salt: z.string(),
    iterations: z.number(),
    bits: z.number().optional(),
})
export type AesHmacSha2KeyDescriptionPassphrase = z.infer<typeof AesHmacSha2KeyDescriptionPassphraseSchema>

export const AesHmacSha2KeyDescriptionSchema = z.object({
    name: z.string().optional(),
    algorithm: z.enum(['m.secret_storage.v1.aes-hmac-sha2']),
    passphrase: AesHmacSha2KeyDescriptionPassphraseSchema.optional(),
    iv: z.string().optional(),
    mac: z.string().optional(),
})
export type AesHmacSha2KeyDescription = z.infer<typeof AesHmacSha2KeyDescriptionSchema>

export const SecretStorageAccountDataSchema = z.object({
    encrypted: z.record(
        z.string(), // Key name
        AesHmacSha2EncryptedDataSchema,
    ),
})
export type SecretStorageAccountData = z.infer<typeof SecretStorageAccountDataSchema>
