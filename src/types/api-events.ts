import * as z from 'zod'
import { camelizeSchema, camelizeSchemaWithoutTransform } from '@/utils/zod'

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroomavatar */
export const EventRoomAvatarContentSchema = z.object({
    info: z.object({
        h: z.number().optional(),
        mimetype: z.string().optional(),
        size: z.number().optional(),
        thumbnailInfo: z.object({
            h: z.number().optional(),
            mimetype: z.string().optional(),
            size: z.number().optional(),
            w: z.number().optional(),
        }).optional(),
        thumbnailUrl: z.string().optional(),
        w: z.number().optional(),
    }).optional(),
    url: z.string().optional(),
})
export type EventRoomAvatarContent = z.infer<typeof EventRoomAvatarContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroomcanonical_alias */
export const EventRoomCanonicalAliasContentSchema = z.object({
    alias: z.string().nullable().optional(),
    altAliases: z.array(z.string()).optional(),
})
export type EventRoomCanonicalAliasContent = z.infer<typeof EventRoomCanonicalAliasContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroomcreate */
export const EventRoomCreateContentSchema = z.object({
    additionalCreators: z.array(z.string()).optional(),
    creator: z.string().optional(),
    'm.federate': z.boolean().optional(),
    predecessor: z.object({
        eventId: z.string().optional(),
        roomId: z.string(),
    }).optional(),
    roomVersion: z.string().optional(),
    type: z.string().optional(),
})
export type EventRoomCreateContent = z.infer<typeof EventRoomCreateContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroomjoin_rules */
export const EventRoomJoinRulesContentSchema = z.object({
    allow: z.array(z.object({
        roomId: z.string().optional(),
        type: z.enum(['m.room_membership']),
    })).optional(),
    joinRule: z.enum(['public', 'knock', 'invite', 'private', 'restricted', 'knock_restricted'])
})
export type EventRoomJoinRulesContent = z.infer<typeof EventRoomJoinRulesContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroommember */
export const EventRoomMemberContentSchema = z.object({
    avatarUrl: z.string().optional(),
    displayname: z.string().nullable().optional(),
    isDirect: z.boolean().optional(),
    joinAuthorisedViaUsersServer: z.string().optional(),
    membership: z.enum(['invite', 'join', 'knock', 'leave', 'ban']),
    reason: z.string().optional(),
    thirdPartyInvite: z.object({
        displayName: z.string(),
        signed: z.object({
            mxid: z.string(),
            signatures: z.record(z.string(), z.record(z.string(), z.string())),
            token: z.string(),
        }),
    }).optional(),
})
export type EventRoomMemberContent = z.infer<typeof EventRoomMemberContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroommessage */
export const EventRoomMessageContentSchema = z.object({
    body: z.string(),
    msgtype: z.string(),
})
export type EventRoomMessageContent = z.infer<typeof EventRoomMessageContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroomname */
export const EventRoomNameContentSchema = z.object({
    name: z.string(),
})
export type EventRoomNameContent = z.infer<typeof EventRoomNameContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroompinned_events */
export const EventRoomPinnedEventsContentSchema = z.object({
    pinned: z.array(z.string()),
})
export type EventRoomPinnedEventsContent = z.infer<typeof EventRoomPinnedEventsContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroompower_levels */
export const EventRoomPowerLevelsContentSchema = z.object({
    ban: z.number().optional(),
    events: z.record(z.string(), z.number()).optional(),
    eventsDefault: z.number().optional(),
    invite: z.number().optional(),
    kick: z.number().optional(),
    notifications: z.record(z.string(), z.number()).optional(),
    redact: z.number().optional(),
    stateDefault: z.number().optional(),
    users: z.record(z.string(), z.number()).optional(),
    usersDefault: z.number().optional(),
})
export type EventRoomPowerLevels = z.infer<typeof EventRoomPowerLevelsContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroomtopic */
export const EventRoomTopicContentSchema = z.object({
    'm.topic': z.object({
        'm.text': z.object({
            body: z.string(),
            mimetype: z.string().optional(),
        }).optional(),
    }).optional,
    topic: z.string(),
})
export type EventRoomTopicContent = z.infer<typeof EventRoomTopicContentSchema>

export const eventContentSchemaByType = {
    // 'm.audio': EventAudioContentSchema,
    // 'm.emote': EventEmoteContentSchema,
    // 'm.file': EventFileContentSchema,
    // 'm.image': EventImageContentSchema,
    // 'm.location': EventLocationContentSchema,
    // 'm.notice': EventNoticeContentSchema,
    'm.room.avatar': EventRoomAvatarContentSchema,
    'm.room.canonical_alias': EventRoomCanonicalAliasContentSchema,
    'm.room.create': EventRoomCreateContentSchema,
    'm.room.join_rules': EventRoomJoinRulesContentSchema,
    'm.room.member': EventRoomMemberContentSchema,
    'm.room.message': EventRoomMessageContentSchema,
    'm.room.name': EventRoomNameContentSchema,
    'm.room.pinned_events': EventRoomPinnedEventsContentSchema,
    'm.room.power_levels': EventRoomPowerLevelsContentSchema,
    'm.room.topic': EventRoomTopicContentSchema,
    // 'm.text': EventTextContentSchema,
    // 'm.video': EventVideoContentSchema,
} as const

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_account-data */
export const ApiV3SyncAccountDataSchema = camelizeSchemaWithoutTransform(z.object({
    events: z.array(z.object({
        content: z.any(), // The fields in this object will vary depending on the type of event. When interacting with the REST API, this is the HTTP body.
        type: z.string(),
    })).optional(),
}))

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_clienteventwithoutroomid */
export const ApiV3SyncClientEventWithoutRoomIdSchemaWithoutUnsigned = camelizeSchemaWithoutTransform(z.object({
    content: z.any(), // The body of this event, as created by the client which sent it.
    event_id: z.string(),
    origin_server_ts: z.number(),
    sender: z.string(),
    state_key: z.string().optional(),
    type: z.string(),
}))
export const ApiV3SyncClientEventWithoutRoomIdSchema = camelizeSchemaWithoutTransform(z.object({
    content: z.any(), // The body of this event, as created by the client which sent it.
    event_id: z.string(),
    origin_server_ts: z.number(),
    sender: z.string(),
    state_key: z.string().optional(),
    type: z.string(),
    unsigned: z.object({
        age: z.number().optional(),
        membership: z.string().optional(),
        prev_content: z.any().optional(), // The previous content for this event.
        redacted_because: ApiV3SyncClientEventWithoutRoomIdSchemaWithoutUnsigned.optional(),
        transaction_id: z.string().optional(),
    }).optional(),
}))
export type ApiV3SyncClientEventWithoutRoomId = z.infer<typeof ApiV3SyncClientEventWithoutRoomIdSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_state */
export const ApiV3SyncStateSchema = camelizeSchemaWithoutTransform(z.object({
    events: z.array(ApiV3SyncClientEventWithoutRoomIdSchema).optional(),
}))

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_roomsummary */
export const ApiV3SyncRoomSummary = camelizeSchemaWithoutTransform(z.object({
    'm.heroes': z.array(z.string()).optional(),
    'm.invited_member_count': z.number().optional(),
    'm.joined_member_count': z.number().optional(),
}))

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_timeline */
export const ApiV3SyncTimeline = camelizeSchemaWithoutTransform(z.object({
    events: z.array(ApiV3SyncClientEventWithoutRoomIdSchema).optional(),
    limited: z.boolean().optional(),
    prev_batch: z.string().optional(),
}))

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_invited-room */
export const ApiV3SyncInvitedRoomSchema = camelizeSchemaWithoutTransform(z.object({
    invite_state: z.object({
        events: z.array(z.object({
            content: z.any(),
            sender: z.string(),
            state_key: z.string(),
            type: z.string(),
        })).optional()
    }).optional(),
}))

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_joined-room */
export const ApiV3SyncJoinedRoomSchema = camelizeSchemaWithoutTransform(z.object({
    account_data: ApiV3SyncAccountDataSchema.optional(),
    ephemeral: z.object({
        events: z.array(z.object({
            content: z.any(), // The fields in this object will vary depending on the type of event. When interacting with the REST API, this is the HTTP body.
            type: z.string(),
        })).optional(),
    }).optional(),
    state: ApiV3SyncStateSchema.optional(),
    state_after: ApiV3SyncStateSchema.optional(),
    summary: ApiV3SyncRoomSummary.optional(),
    timeline: ApiV3SyncTimeline.optional(),
    unread_notifications: z.object({
        highlight_count: z.number().optional(),
        notification_count: z.number().optional(),
    }).optional(),
    unread_thread_notifications: z.record(z.string(), z.object({
        highlight_count: z.number().optional(),
        notification_count: z.number().optional(),
    })).optional(),
}))

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_knocked-room */
export const ApiV3SyncKnockedRoomSchema = camelizeSchemaWithoutTransform(z.object({
    knock_state: z.object({
        events: z.array(z.object({
            account_data: ApiV3SyncAccountDataSchema.optional(),
            state: ApiV3SyncStateSchema.optional(),
            state_after: ApiV3SyncStateSchema.optional(),
            timeline: ApiV3SyncTimeline.optional(),
        })).optional(),
    }).optional(),
}))

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_left-room */
export const ApiV3SyncLeftRoomSchema = camelizeSchemaWithoutTransform(z.object({
    account_data: ApiV3SyncAccountDataSchema.optional(),
    state: ApiV3SyncStateSchema.optional(),
    state_after: ApiV3SyncStateSchema.optional(),
    timeline: ApiV3SyncTimeline.optional(),
}))

/** @see https://spec.matrix.org/v1.17/client-server-api/#extensions-to-sync */
export const ApiV3SyncToDevice = camelizeSchemaWithoutTransform(z.object({
    events: z.array(z.object({
        content: z.any().optional(),
        sender: z.string().optional(),
        type: z.string().optional(),
    })).optional(),
}))

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync */
export interface ApiV3SyncRequest {
    filter?: string;
    full_state?: boolean;
    set_presence?: boolean;
    since?: string;
    timeout?: number;
    use_state_after?: boolean;
}

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync */
export const ApiV3SyncResponseSchema = camelizeSchema(z.object({
    account_data: ApiV3SyncAccountDataSchema.optional(),
    device_lists: z.object({
        changed: z.array(z.string()).optional(),
        left: z.array(z.string()).optional(),
    }).optional(),
    device_one_time_keys_count: z.record(z.string(), z.number()).optional(),
    next_batch: z.string(),
    presence: z.object({
        events: z.array(z.object({
            content: z.any(),
            type: z.string(),
            sender: z.string().optional(),
        })).optional(),
    }).optional(),
    rooms: z.object({
        invite: z.record(z.string(), ApiV3SyncInvitedRoomSchema).optional(),
        join: z.record(z.string(), ApiV3SyncJoinedRoomSchema).optional(),
        knock: z.record(z.string(), ApiV3SyncKnockedRoomSchema).optional(),
        leave: z.record(z.string(), ApiV3SyncLeftRoomSchema).optional(),
    }).optional(),
    to_device: ApiV3SyncToDevice.optional(),
}))
export type ApiV3SyncResponse = z.infer<typeof ApiV3SyncResponseSchema>
