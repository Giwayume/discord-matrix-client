import { type ApiV3SyncClientEventWithoutRoomId } from '@/types'

// Lists all known custom rendered events. The events we do not wish to display in the timeline are commented out.
export const customEventTypes = [
    'm.room.create',
]

// Lists all known "setting-type" events. The events we do not wish to display in the timeline are commented out.
export const settingsEventTypes = [
    // 'm.room.aliases',
    'm.room.avatar',
    // 'm.room.canonical_alias',
    'm.room.encryption',
    // 'm.room.guest_access',
    // 'm.room.history_visibility',
    // 'm.room.join_rules',
    'm.room.member',
    'm.room.name',
    'm.room.pinned_events',
    // 'm.room.power_levels',
    // 'm.room.related_groups',
    // 'm.room.server_acl',
    // 'm.room.third_party_invite',
    'm.room.tombstone',
    // 'm.room.topic',

    // msgtype for m.room.message
    'm.emote',
    'm.location',
    'm.notice',
    'm.poll.response',
    'm.poll.start',
    // 'm.reaction',
    // 'm.replace',
    'm.server_notice',
]

// Lists all known "message-type" events. The events we do not wish to display in the timeline are commented out.
export const messageEventTypes = [
    'm.room.encrypted',
    'm.room.message',
    'm.sticker',

    // msgtype for m.room.message
    'm.audio',
    'm.file',
    'm.image',
    'm.poll.start',
    'm.sticker',
    'm.text',
    'm.video',
]

// Lists all known message types for "message-type" events. The events we do not wish to display in the timeline are commented out.
export const messageEventMessageTypes = [
    'm.audio',
    'm.emote',
    'm.file',
    'm.image',
    'm.location',
    'm.notice',
    // 'm.reaction',
    // 'm.replace',
    'm.server_notice',
    'm.sticker',
    'm.text',
    'm.video',
]

export const visibleMembershipStatuses = ['join', 'leave', 'ban']
export const attachmentEventMessageTypes = [
    'm.audio',
    'm.file',
    'm.image',
    'm.location',
    'm.video'
]

function isEventVisible(event: ApiV3SyncClientEventWithoutRoomId) {
    if (
        !settingsEventTypes.includes(event.type)
        && !messageEventTypes.includes(event.type)
        && !customEventTypes.includes(event.type)
    ) return false
    if (event.type === 'm.room.member') {
        if (!visibleMembershipStatuses.includes(event.content?.membership)) return false
    } else if (event.type === 'm.room.message') {
        if (!messageEventMessageTypes.includes(event.content?.msgtype)) return false
        if (event.content?.['m.relates_to']?.relType === 'm.replace') return false
    }
    return true
}

const redactedEventSafeKeys = new Set(['eventId', 'type', 'sender', 'originServerTs', 'roomId', 'unsigned', 'stateKey'])

export function redactEvent(event: ApiV3SyncClientEventWithoutRoomId) {
    for (const key of Object.keys(event)) {
        if (!redactedEventSafeKeys.has(key)) {
            delete (event as any)[key]
        }
    }
    if (event.content) {
        event.content = {}
    }
}


export function useEventTimeline() {
    return {
        isEventVisible,
        redactEvent,
    }
}
