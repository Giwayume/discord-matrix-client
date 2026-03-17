import {
    type EventContentByType,
    type EventImPoniesImage,
    type ApiV3SyncStrippedStateEvent,
    type ApiV3SyncClientEventWithoutRoomId,
    type ApiV3SyncRoomSummary,
} from './api-events'

export interface RoomSummary {
    avatarUrl?: string;
    creator?: string;
    heroes: string[];
    joinedMemberCount: number;
    name: string;
    roomId: string;
    roomVersion?: string;
    caategoryName?: string;
}

export interface RoomSummaryCategory {
    name: string;
    collapsed?: boolean;
    rooms: RoomSummary[];
}

export interface SpaceSummary {
    avatarUrl?: string;
    creator: string;
    name: string;
    roomId: string;
    roomVersion: string;
}

export type EventDataRecordFrom = {
    [K in keyof EventContentByType]?: EventContentByType[K];
} & {
    [k in string]: any;
};

export type ApiV3SyncStrippedStateEventRecordFrom = {
    [K in keyof EventContentByType]?: ApiV3SyncStrippedStateEvent<
        EventContentByType[K]
    >[];
} & {
    [K in string]: any;
};

export type ApiV3SyncClientEventWithoutRoomIdRecordFrom = {
    [K in keyof EventContentByType]?: ApiV3SyncClientEventWithoutRoomId<
        EventContentByType[K]
    >[];
} & {
    [K in string]: any;
};

export interface RoomReadReceipt {
    eventId: string;
    threadId?: string;
    ts?: number;
}

export interface RoomEventReactionShortEvent {
    sender: string;
    eventId?: string;
    txnId?: string;
}

export interface RoomEventReaction {
    events: RoomEventReactionShortEvent[];
    ts: number;
    key: string;
}

export interface RoomEventReactionRender extends RoomEventReaction {
    highlighted: boolean; // Logged in user reacted
    displaynames: string[];
}

export interface InvitedRoom {
    roomId: string;
    stateEventsByType: ApiV3SyncStrippedStateEventRecordFrom;
}

export interface KnockedRoom {
    roomId: string;
    stateEventsByType: ApiV3SyncStrippedStateEventRecordFrom;
}

export interface JoinedRoom {
    roomId: string;
    accountData: EventDataRecordFrom;
    nonSequentialUpdateUuid: string; // Value changes whenever there's an update (like a redaction) that should trigger an immediate render
    reactions: Record<string, RoomEventReaction[]>;
    readRecepts: Record<string, RoomReadReceipt>;
    redactions: string[];
    replacements: Record<string, ApiV3SyncClientEventWithoutRoomId[]>;
    stateEventsById: Record<string, ApiV3SyncClientEventWithoutRoomId>;
    stateEventsByType: ApiV3SyncClientEventWithoutRoomIdRecordFrom;
    summary: ApiV3SyncRoomSummary;
    visibleTimeline: Array<ApiV3SyncClientEventWithoutRoomId>;
    invisibleTimeline: Array<ApiV3SyncClientEventWithoutRoomId>;
    timelineStartToken?: string; // The next_batch token used to fetch the newest events
    timelineEndToken?: string; // The prev_batch token used to fetch the oldest events
    timelineGapStartToken?: string; // The prev_batch token that represents the start of the gap (newer events)
    timelineGapEndToken?: string; // The next_batch token that represents the end of the gap (older events)
    timelineGapNewestVisibleEventId?: string; // The event_id of the last event we saw before the gap was created
    timelineGapNewestInvisibleEventId?: string; // The event_id of the last event we saw before the gap was created
    typingUserIds: string[];
    unreadNotifications: {
        highlightCount: number;
        notificationCount: number;
    };
    unreadThreadNotifications: Record<string, {
        highlightCount: number;
        notificationCount: number;
    }>;
}

export interface LeftRoom {
    roomId: string;
    accountData: EventDataRecordFrom;
    nonSequentialUpdateUuid: string; // Value changes whenever there's an update (like a redaction) that should trigger an immediate render
    reactions: Record<string, RoomEventReaction[]>;
    redactions: string[];
    replacements: Record<string, ApiV3SyncClientEventWithoutRoomId[]>;
    stateEventsById: Record<string, ApiV3SyncClientEventWithoutRoomId>;
    stateEventsByType: ApiV3SyncClientEventWithoutRoomIdRecordFrom;
    visibleTimeline: Array<ApiV3SyncClientEventWithoutRoomId>;
    invisibleTimeline: Array<ApiV3SyncClientEventWithoutRoomId>;
    timelineStartToken?: string; // The next_batch token used to fetch the newest events
    timelineEndToken?: string; // The prev_batch token used to fetch the oldest events
    timelineGapStartToken?: string; // The prev_batch token that represents the start of the gap (newer events)
    timelineGapEndToken?: string; // The next_batch token that represents the end of the gap (older events)
    timelineGapNewestVisibleEventId?: string; // The event_id of the last event we saw before the gap was created
    timelineGapNewestInvisibleEventId?: string; // The event_id of the last event we saw before the gap was created
}

export interface SpaceClientSettings {
    collapsedCategoryNames: string[];
}

export interface EventWithRenderInfo {
    category: 'settings' | 'message' | 'unknown';
    currentDateDivider: string | undefined;
    displayHeader: boolean;
    displayname: string;
    headerTime: string;
    time: string;
    isoTimestamp: string;
    avatarUrl?: string;
    event: ApiV3SyncClientEventWithoutRoomId;
    reactions: RoomEventReactionRender[];
    replacementEvent?: ApiV3SyncClientEventWithoutRoomId;
    replacementDate?: string;
    replyTo?: {
        userId?: string;
        displayname?: string;
        avatarUrl?: string;
        eventId: string;
        bodyPreview?: string;
        messageType: string;
        isAttachment: boolean;
    };
    showUnencryptedWarning: boolean;
}

export interface EmojiPickerEmojiItem {
    emoji: string;
    description: string;
    codes: string[];
    image?: EventImPoniesImage,
    hidden?: boolean;
}

export interface EmojiPickerCategory {
    id: string;
    category: string;
    emoji: EmojiPickerEmojiItem[];
    hidden?: boolean;
}