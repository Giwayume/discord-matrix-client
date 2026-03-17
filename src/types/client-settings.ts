import * as z from 'zod'

export const ClientSettingsSchema = z.object({
    isDeveloperMode: z.boolean(),
    pointerClickTimeout: z.number(),
    pointerMoveRadius: z.number(),
    pointerPressTimeout: z.number(),
    sendReadReceipts: z.boolean(),
    sendTypingIndicators: z.boolean(),
    warnUnencryptedMessageInEncryptedRoom: z.boolean(),
})
export type ClientSettings = z.infer<typeof ClientSettingsSchema>
