import * as z from 'zod'
import { camelizeSchema } from '@/utils/zod'

export const ApiV3JoinedRoomsResponseSchema = camelizeSchema(z.object({
    joined_rooms: z.array(z.string()),
}))

export type ApiV3JoinedRoomsResponse = z.infer<typeof ApiV3JoinedRoomsResponseSchema>
