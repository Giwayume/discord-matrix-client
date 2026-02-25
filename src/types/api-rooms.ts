import * as z from 'zod'
import { camelizeSchema, camelizeSchemaWithoutTransform } from '@/utils/zod'

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3roomsroomidmessages_response-200_clientevent */
export const ApiV3RoomClientEventWithoutUnsignedSchema = camelizeSchemaWithoutTransform(z.object({
    content: z.any(), // The body of this event, as created by the client which sent it.
    event_id: z.string(),
    origin_server_ts: z.number(),
    room_id: z.string(),
    sender: z.string(),
    state_key: z.string().optional(),
    type: z.string(),
}))
export const ApiV3RoomClientEventSchema = camelizeSchemaWithoutTransform(z.object({
    content: z.any(), // The body of this event, as created by the client which sent it.
    event_id: z.string(),
    origin_server_ts: z.number(),
    room_id: z.string(),
    sender: z.string(),
    state_key: z.string().optional(),
    type: z.string(),
    unsigned: z.object({
        age: z.number().optional(),
        membership: z.string().optional(),
        prev_content: z.any().optional(), // The previous content for this event.
        redacted_because: ApiV3RoomClientEventWithoutUnsignedSchema.optional(),
        replaces_state: z.string().optional(), // UNOFFICIAL. https://github.com/matrix-org/matrix-spec/issues/274
        transaction_id: z.string().optional(),
    }).optional(),
}))
export interface ApiV3RoomClientEvent<C = any> extends z.infer<typeof ApiV3RoomClientEventSchema> {
    content: C;
}

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3joined_rooms */
export const ApiV3JoinedRoomsResponseSchema = camelizeSchema(z.object({
    joined_rooms: z.array(z.string()),
}))
export type ApiV3JoinedRoomsResponse = z.infer<typeof ApiV3JoinedRoomsResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3roomsroomidmessages */
export interface ApiV3RoomMessagesRequest {
    dir: string;
    filter?: string;
    from?: string;
    limit?: number;
    to?: string;
}

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3roomsroomidmessages_response-200_clientevent */
export const ApiV3RoomMessagesResponseSchema = camelizeSchema(z.object({
    chunk: z.array(ApiV3RoomClientEventSchema),
    end: z.string().optional(),
    start: z.string(),
    state: z.array(ApiV3RoomClientEventSchema).optional(),
}))
export type ApiV3RoomMessagesResponse = z.infer<typeof ApiV3RoomMessagesResponseSchema>
