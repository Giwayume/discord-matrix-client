import * as z from 'zod'
import { camelizeSchema } from '@/utils/zod'

export const ApiV3ProfileResponseSchema = camelizeSchema(z.object({
    avatar_url: z.string().optional(),
    displayname: z.string().optional(),
    'm.tz': z.string().optional(),
}))

export type ApiV3ProfileResponse = z.infer<typeof ApiV3ProfileResponseSchema>
