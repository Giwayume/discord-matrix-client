import * as z from 'zod'
import { camelizeSchema, camelizeSchemaWithoutTransform } from '@/utils/zod'

/** @see https://spec.matrix.org/v1.17/client-server-api/#post_matrixclientv3keysclaim */
export interface ApiV3KeysClaimRequest {
    one_time_keys: Record<string, Record<string, string>>;
    timeout?: number;
}
export const ApiV3KeysClaimResponseSchema = camelizeSchema(z.object({
    failures: z.record(z.string(), z.any()).optional(),
    one_time_keys: z.record(
        z.string(), // User ID
        z.record(
            z.string(), // Device
            z.record(
                z.string(), // <algorithm>:<key_id>
                z.union([
                    z.string(),
                    z.object({
                        key: z.string(),
                        signatures: z.record(
                            z.string(), // User ID
                            z.any(), // Signing JSON
                        )
                    })
                ]),
            ),
        ),
    ),
}))
export type ApiV3KeysClaimResponse = z.infer<typeof ApiV3KeysClaimResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3keyschanges */
export interface ApiV3KeysChangesRequest {
    from: string;
    to: string;
}
export const ApiV3KeysChangesResponseSchema = camelizeSchema(z.object({
    changed: z.array(z.string()).optional(),
    left: z.array(z.string()).optional(),
}))
export type ApiV3KeysChangesResponse = z.infer<typeof ApiV3KeysChangesResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#post_matrixclientv3keysquery */
export interface ApiV3KeysQueryRequest {
    device_keys: Record<string, string[]>;
    timeout?: number;
}
export const ApiV3DeviceInformationSchema = camelizeSchemaWithoutTransform(z.object({
    algorithms: z.array(z.string()),
    device_id: z.string(),
    keys: z.record(
        z.string(), // <algorithm>:<device_id>
        z.string(), // Unpadded base64 public key
    ),
    signatures: z.record(
        z.string(), // User ID
        z.record(
            z.string(), // <algorithm>:<device_id>
            z.string(), // Signature
        ),
    ),
    unsigned: z.object({
        device_display_name: z.string().optional(),
    }).optional(),
    user_id: z.string(),
}))
export const ApiV3CrossSigningKeySchema = camelizeSchemaWithoutTransform(z.object({
    keys: z.record(
        z.string(), // <algorithm>:<unpadded_base64_public_key>
        z.string(), // Unpadded base64 public key
    ),
    signatures: z.any().optional(),
    usage: z.array(z.string()),
    user_id: z.string(),
}))
export const ApiV3KeysQueryResponseSchema = camelizeSchema(z.object({
    device_keys: z.record(
        z.string(), // User ID
        z.record(
            z.string(), // Device ID
            ApiV3DeviceInformationSchema,
        )
    ).optional(),
    failures: z.record(
        z.string(),
        z.any(),
    ).optional(),
    master_keys: z.record(
        z.string(), // User ID
        ApiV3CrossSigningKeySchema,
    ).optional(),
    self_signing_keys: z.record(
        z.string(), // User ID
        ApiV3CrossSigningKeySchema,
    ).optional(),
    user_signing_keys: z.record(
        z.string(), // User ID
        ApiV3CrossSigningKeySchema,
    ).optional(),
}))
export type ApiV3KeysQueryResponse = z.infer<typeof ApiV3KeysQueryResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#post_matrixclientv3keysupload */
export interface ApiV3KeysUploadRequest {
    device_keys?: {
        algorithms: string[];
        device_id: string;
        keys: Record<string, string>;
        signatures: Record<string, Record<string, string>>;
        user_id: string;
    };
    fallback_keys?: Record<string, string | {
        key: string;
        signatures: Record<string, any>;
    }>;
    one_time_keys?: Record<string, string | {
        key: string;
        signatures: Record<string, any>;
    }>;
}
export const ApiV3KeysUploadResponseSchema = camelizeSchema(z.object({
    one_time_key_counts: z.record(z.string(), z.number()),
}))
export type ApiV3KeysUploadResponse = z.infer<typeof ApiV3KeysUploadResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#post_matrixclientv3keysdevice_signingupload */
export interface ApiV3CrossSigningKeyRequest {
    keys: Record<string, string>;
    signatures?: any;
    usage: string[];
    user_id: string;
}
export interface ApiV3KeysDeviceSigningUploadRequest {
    auth?: {
        session?: string;
        type?: string;
        [key: string]: any;
    };
    master_key?: ApiV3CrossSigningKeyRequest;
    self_signing_key?: ApiV3CrossSigningKeyRequest;
    user_signing_key?: ApiV3CrossSigningKeyRequest;
}

/** @see https://spec.matrix.org/v1.17/client-server-api/#post_matrixclientv3keyssignaturesupload */
export type ApiV3KeysSignaturesUploadRequest = Record<string, Record<string, any>>
