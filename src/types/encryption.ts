import * as z from 'zod'

/** @see https://spec.matrix.org/v1.17/client-server-api/#sending-encrypted-attachments */
export const EncryptedFileJsonWebKeySchema = z.object({
    kty: z.enum(['oct']),
    keyOps: z.array(z.string()),
    alg: z.enum(['A256CTR']),
    k: z.string(),
    ext: z.boolean(),
})
export type EncryptedFileJsonWebKey = z.infer<typeof EncryptedFileJsonWebKeySchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#sending-encrypted-attachments */
export const EncryptedFileSchema = z.object({
    url: z.string(),
    key: EncryptedFileJsonWebKeySchema,
    iv: z.string(),
    hashes: z.record(
        z.string(), // Algorithm name
        z.string(), // Hash of cipher text
    ),
    v: z.enum(['v2']),
})
export type EncryptedFile = z.infer<typeof EncryptedFileSchema>
