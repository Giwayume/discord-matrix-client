import * as z from 'zod'
import { camelizeSchema } from '@/utils/zod'
import type { EventAudioContent, EventImageContent, EventVideoContent } from '@/types/api-events'

/** @see https://spec.matrix.org/v1.17/client-server-api/#post_matrixmediav1create */
export const ApiV3MediaCreateResponseSchema = camelizeSchema(z.object({
    content_uri: z.string(),
    unused_expires_at: z.number().optional(),
}))
export type ApiV3MediaCreateResponse = z.infer<typeof ApiV3MediaCreateResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#post_matrixmediav3upload */
export const ApiV3MediaUploadResponseSchema = camelizeSchema(z.object({
    content_uri: z.string(),
}))
export type ApiV3MediaUploadResponse = z.infer<typeof ApiV3MediaUploadResponseSchema>

export interface MediaAudioInfo {
    type: 'audio';
    info: EventAudioContent['info'];
}
export interface MediaImageInfo {
    type: 'image';
    info: EventImageContent['info'];
}
export interface MediaVideoInfo {
    type: 'video';
    info: EventVideoContent['info'];
}
export interface MediaUnknownInfo {
    type: 'unknown';
}
export type MediaInfo = MediaAudioInfo | MediaImageInfo | MediaVideoInfo | MediaUnknownInfo