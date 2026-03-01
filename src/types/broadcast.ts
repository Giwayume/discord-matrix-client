import * as z from 'zod'
import { ApiV3SyncResponseSchema } from './api-events'

export const BroadcastApiV3SyncMessageSchema = z.object({
    fromLeader: z.boolean().optional(),
    fromTabId: z.string().optional(),
    type: z.literal('apiV3Sync'),
    data: ApiV3SyncResponseSchema,
})
export type BroadcastApiV3SyncMessage = z.infer<typeof BroadcastApiV3SyncMessageSchema>

export const BroadcastPopulateRoomKeysFromMegolmBackupMessageSchema = z.object({
    fromLeader: z.boolean().optional(),
    fromTabId: z.string().optional(),
    type: z.literal('populateRoomKeysFromMegolmBackup'),
    data: z.any(),
})
export type BroadcastPopulateRoomKeysFromMegolmBackupMessage = z.infer<typeof BroadcastPopulateRoomKeysFromMegolmBackupMessageSchema>

export const BroadcastSyncStatusMessageSchema = z.object({
    fromLeader: z.boolean().optional(),
    fromTabId: z.string().optional(),
    type: z.literal('syncStatus'),
    data: z.object({
        status: z.enum(['online', 'offline'])
    }),
})
export type BroadcastSyncStatusMessage = z.infer<typeof BroadcastSyncStatusMessageSchema>

export const broadcastMessageSchemaByType = {
    'apiV3Sync': BroadcastApiV3SyncMessageSchema,
    'populateRoomKeysFromMegolmBackup': BroadcastPopulateRoomKeysFromMegolmBackupMessageSchema,
    'syncStatus': BroadcastSyncStatusMessageSchema,
}

export type BroadcastMessage = (
    BroadcastApiV3SyncMessage
    | BroadcastPopulateRoomKeysFromMegolmBackupMessage
    | BroadcastSyncStatusMessage
)
