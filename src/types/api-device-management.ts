
import * as z from 'zod'
import { camelizeSchema, camelizeSchemaWithoutTransform } from '@/utils/zod'

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3devicesdeviceid */
export const ApiV3DeviceResponseSchema = camelizeSchemaWithoutTransform(z.object({
    device_id: z.string(),
    display_name: z.string().nullable().optional(), // Nullable is not spec-compliant, but some server implementations do this.
    last_seen_ip: z.string().nullable().optional(), // Nullable is not spec-compliant, but some server implementations do this.
    last_seen_ts: z.number().nullable().optional(), // Nullable is not spec-compliant, but some server implementations do this.
    is_mobile: z.boolean().optional(), // UI-only field.
}))
export type ApiV3DeviceResponse = z.infer<typeof ApiV3DeviceResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3devices */
export const ApiV3DevicesResponseSchema = camelizeSchema(z.object({
    devices: z.array(ApiV3DeviceResponseSchema).optional(),
}))
export type ApiV3DevicesResponse = z.infer<typeof ApiV3DevicesResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#delete_matrixclientv3devicesdeviceid */
export interface ApiV3DeleteDeviceRequest {
    auth?: {
        session?: string;
        type?: string;
        [key: string]: any;
    }
}
export const ApiV3DeleteDeviceAuthenticationResponseSchema = camelizeSchema(z.object({
    completed: z.array(z.string()).optional(),
    flows: z.array(z.object({
        stages: z.array(z.string()),
    })),
    params: z.record(z.string(), z.any()).optional(),
    session: z.string().optional(),
}))
export type ApiV3DeleteDeviceAuthenticationResponse = z.infer<typeof ApiV3DeleteDeviceAuthenticationResponseSchema>
