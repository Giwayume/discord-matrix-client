import * as z from 'zod'
import { camelizeSchema } from '@/utils/zod'

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3profileuserid */
export const ApiV3ProfileResponseSchema = camelizeSchema(z.object({
    avatar_url: z.string().optional(),
    displayname: z.string().optional(),
    'm.tz': z.string().optional(),
}))
export type ApiV3ProfileResponse = z.infer<typeof ApiV3ProfileResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#post_matrixclientv3user_directorysearch */
export interface ApiV3UserDirectorySearchRequest {
    limit?: number;
    search_term: string;
}
export const ApiV3UserDirectorySearchResponseSchema = camelizeSchema(z.object({
    limited: z.boolean(),
    results: z.array(z.object({
        avatar_url: z.string().optional(),
        display_name: z.string().optional(),
        user_id: z.string(),
    }))
}))
export type ApiV3UserDirectorySearchResponse = z.infer<typeof ApiV3UserDirectorySearchResponseSchema>