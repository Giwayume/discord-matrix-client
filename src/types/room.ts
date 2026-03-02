import {
    type EventContentByType,
    type ApiV3SyncStrippedStateEvent,
    type ApiV3SyncClientEventWithoutRoomId,
    type ApiV3SyncRoomSummary,
} from './api-events'

export interface RoomSummary {
    avatarUrl?: string;
    creator: string;
    heroes: string[];
    id: string;
    joinedMemberCount: number;
    name: string;
    roomVersion: string;
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
    readRecepts: Record<string, RoomReadReceipt>;
    stateEventsById: Record<string, ApiV3SyncClientEventWithoutRoomId>;
    stateEventsByType: ApiV3SyncClientEventWithoutRoomIdRecordFrom;
    summary: ApiV3SyncRoomSummary;
    timeline: Array<ApiV3SyncClientEventWithoutRoomId>;
    timelineStartToken?: string; // The next_batch token used to fetch the newest events
    timelineEndToken?: string; // The prev_batch token used to fetch the oldest events
    timelineGapStartToken?: string; // The prev_batch token that represents the start of the gap (newer events)
    timelineGapEndToken?: string; // The next_batch token that represents the end of the gap (older events)
    timelineGapNewestEventId?: string; // The event_id of the last event we saw before the gap was created
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
    stateEventsById: Record<string, ApiV3SyncClientEventWithoutRoomId>;
    stateEventsByType: ApiV3SyncClientEventWithoutRoomIdRecordFrom;
    timeline: Array<ApiV3SyncClientEventWithoutRoomId>;
    timelineStartToken?: string; // The next_batch token used to fetch the newest events
    timelineEndToken?: string; // The prev_batch token used to fetch the oldest events
    timelineGapStartToken?: string; // The prev_batch token that represents the start of the gap (newer events)
    timelineGapEndToken?: string; // The next_batch token that represents the end of the gap (older events)
    timelineGapNewestEventId?: string; // The event_id of the last event we saw before the gap was created
}
