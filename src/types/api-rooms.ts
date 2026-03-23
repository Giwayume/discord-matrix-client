import * as z from 'zod'
import { camelizeSchema, camelizeSchemaWithoutTransform } from '@/utils/zod'

import type { EventRoomPowerLevelsContent } from '@/types/api-events'

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

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv1roomsroomidhierarchy */
export interface ApiV1RoomHierarchyRequest {
    from?: string;
    limit?: number;
    max_depth?: number;
    suggested_only?: boolean;
}
export const ApiV1StrippedChildStateEventSchema = camelizeSchemaWithoutTransform(z.object({
    content: z.any(),
    origin_server_ts: z.number(),
    sender: z.string(),
    state_key: z.string(),
    type: z.string(),
}))
export const ApiV1RoomHierarchyResponseSchema = camelizeSchema(z.object({
    next_batch: z.string().optional(),
    rooms: z.array(z.object({
        allowed_room_ids: z.array(z.string()).optional(),
        avatar_url: z.string().optional(),
        canonical_alias: z.string().optional(),
        children_state: z.array(ApiV1StrippedChildStateEventSchema),
        encryption: z.enum(['m.megolm.v1.aes-sha2']).optional(),
        guest_can_join: z.boolean().optional(),
        join_rule: z.string().optional(),
        name: z.string().optional(),
        num_joined_members: z.number(),
        room_id: z.string(),
        room_type: z.string().optional(),
        room_version: z.string().optional(),
        topic: z.string().optional(),
        world_readable: z.boolean(),
    })),
}))
export type ApiV1RoomHierarchyResponse = z.infer<typeof ApiV1RoomHierarchyResponseSchema>

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

/** @see https://spec.matrix.org/v1.17/client-server-api/#put_matrixclientv3roomsroomidredacteventidtxnid */
export interface ApiV3RoomRedactMessageRequest {
    reason?: string;
}
export const ApiV3RoomRedactMessageResponseSchema = camelizeSchema(z.object({
    event_id: z.string().optional(),
}))
export type ApiV3RoomRedactMessageResponse = z.infer<typeof ApiV3RoomRedactMessageResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#put_matrixclientv3roomsroomidtypinguserid */
export interface ApiV3RoomTypingRequest {
    timeout?: number;
    typing: boolean;
}

/** @see https://spec.matrix.org/v1.17/client-server-api/#put_matrixclientv3roomsroomidsendeventtypetxnid */
export const ApiV3RoomSendMessageEventResponseSchema = camelizeSchema(z.object({
    event_id: z.string(),
}))
export type ApiV3RoomSendMessageEventResponse = z.infer<typeof ApiV3RoomSendMessageEventResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#post_matrixclientv3roomsroomidjoin */
export interface ApiV3RoomJoinRequest {
    reason?: string;
    third_party_signed?: {
        mxid: string;
        sender: string;
        signatures: Record<string, Record<string, string>>;
        token: string;
    };
}
export const ApiV3RoomJoinResponseSchema = camelizeSchema(z.object({
    room_id: z.string(),
}))
export type ApiV3RoomJoinResponse = z.infer<typeof ApiV3RoomJoinResponseSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#post_matrixclientv3roomsroomidleave */
export interface ApiV3RoomLeaveRequest {
    reason?: string;
}

/** @see https://spec.matrix.org/v1.17/client-server-api/#post_matrixclientv3createroom */
export interface ApiV3RoomCreateStateEvent {
    content: any;
    state_key?: string;
    type: string;
}
export interface ApiV3RoomCreateInvite3pid {
    address: string;
    id_access_token: string;
    id_server: string;
    medium: string;
}
export interface ApiV3RoomCreateRequest {
    creation_content?: {};
    initial_state?: ApiV3RoomCreateStateEvent[];
    invite?: string[];
    invite_3pid?: ApiV3RoomCreateInvite3pid[];
    is_direct?: boolean;
    name?: string;
    power_level_content_override?: EventRoomPowerLevelsContent;
    preset?: 'private_chat' | 'public_chat' | 'trusted_private_chat';
    room_alias_name?: string;
    room_version?: string;
    topic?: string;
    visibility?: 'public' | 'private';
}
export const ApiV3RoomCreateResponseSchema = camelizeSchema(z.object({
    room_id: z.string(),
}))
export type ApiV3RoomCreateResponse = z.infer<typeof ApiV3RoomCreateResponseSchema>
