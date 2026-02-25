import * as z from 'zod'
import { camelizeSchema, camelizeSchemaWithoutTransform } from '@/utils/zod'

import { PushNotificationPushRuleSchema } from './api-push-notifications'

/** https://spec.matrix.org/v1.17/client-server-api/#mforwarded_room_key */
export const EventForwardedRoomKeyContentSchema = z.object({
    algorithm: z.string(),
    forwardingCurve25519KeyChain: z.array(z.string()),
    roomId: z.string(),
    senderClaimedEd25519Key: z.string(),
    senderKey: z.string(),
    sessionId: z.string(),
    sessionKey: z.string(),
    withheld: z.object({
        code: z.string().optional(),
        reason: z.string().optional(),
    }).optional(),
})
export type EventForwardedRoomKeyContent = z.infer<typeof EventForwardedRoomKeyContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mpresence */
export const EventPresenceContentSchema = z.object({
    avatarUrl: z.string().optional(),
    currentlyActive: z.boolean().optional(),
    displayname: z.string().optional(),
    lastActiveAgo: z.number().optional(),
    presence: z.enum(['online', 'offline', 'unavailable']),
    statusMsg: z.string().optional(),
})
export type EventPresenceContent = z.infer<typeof EventPresenceContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mpush_rules */
export const EventPushRulesContentSchema = z.object({
    global: z.object({
        content: z.array(PushNotificationPushRuleSchema).optional(),
        override: z.array(PushNotificationPushRuleSchema).optional(),
        room: z.array(PushNotificationPushRuleSchema).optional(),
        sender: z.array(PushNotificationPushRuleSchema).optional(),
        underride: z.array(PushNotificationPushRuleSchema).optional(),
    }).optional(),
})
export type EventPushRulesContent = z.infer<typeof EventPushRulesContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mreceipt */
export const EventReceiptContentSchema = z.record(z.string(), z.object({
    'm.read': z.record(z.string(), z.object({
        threadId: z.string().optional(),
        ts: z.number().optional(),
    })),
    'm.read.private': z.record(z.string(), z.object({
        threadId: z.string().optional(),
        ts: z.number().optional(),
    })),
}))
export type EventReceiptContent = z.infer<typeof EventReceiptContentSchema>

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

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroomencrypted */
export const EventRoomEncryptedContentSchema = z.object({
    algorithm: z.enum(['m.olm.v1.curve25519-aes-sha2', 'm.megolm.v1.aes-sha2']),
    ciphertext: z.union([
        z.string(),
        z.record(z.string(), z.object({
            body: z.string().optional(),
            type: z.number().optional(),
        }))
    ]),
    deviceId: z.string().optional(),
    senderKey: z.string().optional(),
    sessionId: z.string().optional(),
})
export type EventRoomEncryptedContent = z.infer<typeof EventRoomEncryptedContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroomjoin_rules */
export const EventRoomJoinRulesContentSchema = z.object({
    allow: z.array(z.object({
        roomId: z.string().optional(),
        type: z.enum(['m.room_membership']),
    })).optional(),
    joinRule: z.enum(['public', 'knock', 'invite', 'private', 'restricted', 'knock_restricted'])
})
export type EventRoomJoinRulesContent = z.infer<typeof EventRoomJoinRulesContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroom_key */
export const EventRoomKeyContentSchema = z.object({
    algorithm: z.enum(['m.megolm.v1.aes-sha2']),
    roomId: z.string(),
    sessionId: z.string(),
    sessionKey: z.string(),
})
export type EventRoomKeyContent = z.infer<typeof EventRoomKeyContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroom_key_request */
export const EventRoomKeyRequestContentSchema = z.object({
    action: z.enum(['request', 'request_cancellation']),
    body: z.object({
        algorithm: z.string(),
        roomId: z.string(),
        senderKey: z.string().optional(),
        sessionId: z.string(),
    }).optional(),
    requestId: z.string(),
    requestingDeviceId: z.string(),
})
export type EventRoomKeyRequestContent = z.infer<typeof EventRoomKeyRequestContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroom_keywithheld */
export const EventRoomKeyWithheldContentSchema = z.object({
    algorithm: z.enum(['m.megolm.v1.aes-sha2']),
    code: z.enum(['m.blacklisted', 'm.unverified', 'm.unauthorised', 'm.unavailable', 'm.no_olm']),
    reason: z.string().optional(),
    roomId: z.string().optional(),
    senderKey: z.string(),
    sessionId: z.string().optional(),
})
export type EventRoomKeyWithheldContent = z.infer<typeof EventRoomKeyWithheldContentSchema>

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
export type EventRoomPowerLevelsContent = z.infer<typeof EventRoomPowerLevelsContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroomredaction */
export const EventRoomRedactionContentSchema = z.object({
    reason: z.string().optional(),
    redacts: z.string().optional(),
})
export type EventRoomRedactionContent = z.infer<typeof EventRoomRedactionContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mroomtopic */
export const EventRoomTopicContentSchema = z.object({
    'm.topic': z.object({
        'm.text': z.object({
            body: z.string(),
            mimetype: z.string().optional(),
        }).optional(),
    }).optional(),
    topic: z.string(),
})
export type EventRoomTopicContent = z.infer<typeof EventRoomTopicContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mspacechild */
export const EventSpaceChildContentSchema = z.object({
    order: z.string().optional(),
    suggested: z.boolean().optional(),
    via: z.array(z.string()),
})
export type EventSpaceChildContent = z.infer<typeof EventSpaceChildContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mspaceparent */
export const EventSpaceParentContentSchema = z.object({
    canonical: z.boolean().optional(),
    via: z.array(z.string()),
})
export type EventSpaceParentContent = z.infer<typeof EventSpaceParentContentSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#mtyping */
export const EventTypingContentSchema = z.object({
    userIds: z.array(z.string()),
})
export type EventTypingContent = z.infer<typeof EventTypingContentSchema>

export const eventContentSchemaByType = {
    // 'm.audio': EventAudioContentSchema,
    'm.dummy': z.any(),
    // 'm.emote': EventEmoteContentSchema,
    // 'm.file': EventFileContentSchema,
    'm.forwarded_room_key': EventForwardedRoomKeyContentSchema,
    // 'm.image': EventImageContentSchema,
    // 'm.location': EventLocationContentSchema,
    // 'm.notice': EventNoticeContentSchema,
    'm.presence': EventPresenceContentSchema,
    'm.push_rules': EventPushRulesContentSchema,
    'm.receipt': EventReceiptContentSchema,
    'm.room.avatar': EventRoomAvatarContentSchema,
    'm.room.canonical_alias': EventRoomCanonicalAliasContentSchema,
    'm.room.create': EventRoomCreateContentSchema,
    'm.room.encrypted': EventRoomEncryptedContentSchema,
    'm.room.join_rules': EventRoomJoinRulesContentSchema,
    'm.room.member': EventRoomMemberContentSchema,
    'm.room.message': EventRoomMessageContentSchema,
    'm.room.name': EventRoomNameContentSchema,
    'm.room.pinned_events': EventRoomPinnedEventsContentSchema,
    'm.room.power_levels': EventRoomPowerLevelsContentSchema,
    'm.room.redaction': EventRoomRedactionContentSchema,
    'm.room.topic': EventRoomTopicContentSchema,
    'm.room_key': EventRoomKeyContentSchema,
    'm.room_key_request': EventRoomKeyRequestContentSchema,
    'm.space.child': EventSpaceChildContentSchema,
    'm.space.parent': EventSpaceParentContentSchema,
    // 'm.text': EventTextContentSchema,
    'm.typing': EventTypingContentSchema,
    // 'm.video': EventVideoContentSchema,
} as const

export interface EventContentByType {
    // 'm.audio': EventAudioContent,
    'm.dummy': any,
    // 'm.emote': EventEmoteContent,
    // 'm.file': EventFileContent,
    'm.forwarded_room_key': EventForwardedRoomKeyContent,
    // 'm.image': EventImageContent,
    // 'm.location': EventLocationContent,
    // 'm.notice': EventNoticeContent,
    'm.presence': EventPresenceContent,
    'm.push_rules': EventPushRulesContent,
    'm.receipt': EventReceiptContent,
    'm.room.avatar': EventRoomAvatarContent,
    'm.room.canonical_alias': EventRoomCanonicalAliasContent,
    'm.room.create': EventRoomCreateContent,
    'm.room.encrypted': EventRoomEncryptedContent,
    'm.room.join_rules': EventRoomJoinRulesContent,
    'm.room.member': EventRoomMemberContent,
    'm.room.message': EventRoomMessageContent,
    'm.room.name': EventRoomNameContent,
    'm.room.pinned_events': EventRoomPinnedEventsContent,
    'm.room.power_levels': EventRoomPowerLevelsContent,
    'm.room.redaction': EventRoomRedactionContent,
    'm.room.topic': EventRoomTopicContent,
    'm.room_key': EventRoomKeyContent,
    'm.room_key_request': EventRoomKeyRequestContent,
    'm.space.child': EventSpaceChildContent,
    'm.space.parent': EventSpaceParentContent,
    // 'm.text': EventTextContent,
    'm.typing': EventTypingContent,
    // 'm.video': EventVideoContent,
}

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_account-data */
export const ApiV3SyncAccountDataSchema = camelizeSchemaWithoutTransform(z.object({
    events: z.array(z.object({
        content: z.any(), // The fields in this object will vary depending on the type of event. When interacting with the REST API, this is the HTTP body.
        type: z.string(),
    })).optional(),
}))
export interface ApiV3SyncAccountDataEvent<C = any> {
    content: C;
    type: string;
}

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
        replaces_state: z.string().optional(), // UNOFFICIAL. https://github.com/matrix-org/matrix-spec/issues/274
        transaction_id: z.string().optional(),
    }).optional(),
}))
export interface ApiV3SyncClientEventWithoutRoomId<C = any> extends z.infer<typeof ApiV3SyncClientEventWithoutRoomIdSchema> {
    content: C;
}

export const ApiV3SyncStrippedStateEventSchema = camelizeSchemaWithoutTransform(z.object({
    content: z.any(),
    sender: z.string(),
    state_key: z.string(),
    type: z.string(),
}))
export interface ApiV3SyncStrippedStateEvent<C = any> extends z.infer<typeof ApiV3SyncStrippedStateEventSchema> {
    content: C;
}

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_state */
export const ApiV3SyncStateSchema = camelizeSchemaWithoutTransform(z.object({
    events: z.array(ApiV3SyncClientEventWithoutRoomIdSchema).optional(),
}))

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_roomsummary */
export const ApiV3SyncRoomSummarySchema = camelizeSchemaWithoutTransform(z.object({
    'm.heroes': z.array(z.string()).optional(),
    'm.invited_member_count': z.number().optional(),
    'm.joined_member_count': z.number().optional(),
}))
export type ApiV3SyncRoomSummary = z.infer<typeof ApiV3SyncRoomSummarySchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_timeline */
export const ApiV3SyncTimelineSchema = camelizeSchemaWithoutTransform(z.object({
    events: z.array(ApiV3SyncClientEventWithoutRoomIdSchema).optional(),
    limited: z.boolean().optional(),
    prev_batch: z.string().optional(),
}))
export type ApiV3SyncTimeline = z.infer<typeof ApiV3SyncTimelineSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_invited-room */
export const ApiV3SyncInvitedRoomSchema = camelizeSchemaWithoutTransform(z.object({
    invite_state: z.object({
        events: z.array(ApiV3SyncStrippedStateEventSchema).optional()
    }).optional(),
}))
export type ApiV3SyncInvitedRoom = z.infer<typeof ApiV3SyncInvitedRoomSchema>

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
    summary: ApiV3SyncRoomSummarySchema.optional(),
    timeline: ApiV3SyncTimelineSchema.optional(),
    unread_notifications: z.object({
        highlight_count: z.number().optional(),
        notification_count: z.number().optional(),
    }).optional(),
    unread_thread_notifications: z.record(z.string(), z.object({
        highlight_count: z.number().optional(),
        notification_count: z.number().optional(),
    })).optional(),
}))
export type ApiV3SyncJoinedRoom = z.infer<typeof ApiV3SyncJoinedRoomSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_knocked-room */
export const ApiV3SyncKnockedRoomSchema = camelizeSchemaWithoutTransform(z.object({
    knock_state: z.object({
        events: z.array(ApiV3SyncStrippedStateEventSchema).optional(),
    }).optional(),
}))
export type ApiV3SyncKnockedRoom = z.infer<typeof ApiV3SyncKnockedRoomSchema>

/** @see https://spec.matrix.org/v1.17/client-server-api/#get_matrixclientv3sync_response-200_left-room */
export const ApiV3SyncLeftRoomSchema = camelizeSchemaWithoutTransform(z.object({
    account_data: ApiV3SyncAccountDataSchema.optional(),
    state: ApiV3SyncStateSchema.optional(),
    state_after: ApiV3SyncStateSchema.optional(),
    timeline: ApiV3SyncTimelineSchema.optional(),
}))
export type ApiV3SyncLeftRoom = z.infer<typeof ApiV3SyncLeftRoomSchema>

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
