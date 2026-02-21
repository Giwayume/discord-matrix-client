import * as z from 'zod'
import { ApiV3SyncResponseSchema } from './api-events'

export const BroadcastApiV3SyncMessageSchema = z.object({
    type: z.literal('apiV3Sync'),
    data: ApiV3SyncResponseSchema,
})
export type BroadcastApiV3SyncMessage = z.infer<typeof BroadcastApiV3SyncMessageSchema>

export const BroadcastSyncStatusMessageSchema = z.object({
    type: z.literal('syncStatus'),
    data: z.object({
        status: z.enum(['online', 'offline'])
    }),
})
export type BroadcastSyncStatusMessage = z.infer<typeof BroadcastSyncStatusMessageSchema>

export const broadcastMessageSchemaByType = {
    'apiV3Sync': BroadcastApiV3SyncMessageSchema,
    'syncStatus': BroadcastSyncStatusMessageSchema,
}

export type BroadcastMessage = BroadcastApiV3SyncMessage | BroadcastSyncStatusMessage
