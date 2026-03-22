import { computed, ref, toRaw, watch } from 'vue'
import { defineStore } from 'pinia'

import { useBroadcast } from '@/composables/broadcast'

import {
    getAllTableKeys as getAllDiscortixTableKeys,
    loadTableKey as loadDiscortixTableKey,
    saveTableKey as saveDiscortixTableKey,
} from '@/stores/database/discortix'

import {
    eventContentSchemaByType,
    type ApiV3SyncResponse,
    type ApiV3UserDirectorySearchResponse,
    type UserProfile,
} from '@/types'

export const useProfileStore = defineStore('profile', () => {
    const { isLeader } = useBroadcast()

    const profilesLoading = ref<boolean>(true)
    const profilesLoadError = ref<Error | null>(null)
    const profiles = ref<Record<string, UserProfile>>({})

    async function initialize() {
        try {
            const keys: string[] = await getAllDiscortixTableKeys('profiles')
            const fetchPromises: Array<Promise<[string, UserProfile]>> = []
            for (const key of keys) {
                fetchPromises.push(loadDiscortixTableKey('profiles', key).then((userProfile) => [key, userProfile]))
            }
            const settleResults = await Promise.allSettled(fetchPromises)
            for (const settleResult of settleResults) {
                if (settleResult.status === 'fulfilled') {
                    const [userId, profile] = settleResult.value
                    profiles.value[userId] = profile
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                profilesLoadError.value = error
            } else {
                profilesLoadError.value = new Error('The thrown object was not an error.')
            }
        }
        profilesLoading.value = false
    }
    initialize()

    /* Authenticated User Avatar URL */
    const authenticatedUserAvatarUrl = ref<string | undefined>(localStorage.getItem('mx_profile_avatar_url') ?? undefined)
    watch(() => authenticatedUserAvatarUrl.value, (authenticatedUserAvatarUrl) => {
        if (authenticatedUserAvatarUrl != null) {
            localStorage.setItem('mx_profile_avatar_url', authenticatedUserAvatarUrl)
        } else {
            localStorage.removeItem('mx_profile_avatar_url')
        }
    })

    /* Authenticated User Display Name */
    const authenticatedUserDisplayName = ref<string | undefined>(localStorage.getItem('mx_profile_displayname') ?? undefined)
    watch(() => authenticatedUserDisplayName.value, (authenticatedUserDisplayName) => {
        if (authenticatedUserDisplayName != null) {
            localStorage.setItem('mx_profile_displayname', authenticatedUserDisplayName)
        } else {
            localStorage.removeItem('mx_profile_displayname')
        }
    })

    async function populateFromApiV3SyncResponse(sync: ApiV3SyncResponse) {
        let touchedUserIds = new Set<string>()
        if (sync.rooms?.join) {
            for (const roomId in sync.rooms.join) {
                for (const memberEvent of sync.rooms.join[roomId]?.state?.events ?? []) {
                    if (memberEvent.type === 'm.room.member') {
                        const eventContentParse = eventContentSchemaByType['m.room.member'].safeParse(memberEvent.content)
                        if (!eventContentParse.success) continue
                        if (!profiles.value[memberEvent.sender]) {
                            profiles.value[memberEvent.sender] = {
                                userId: memberEvent.sender,
                                currentlyActive: false,
                                presence: 'offline',
                            }
                        }
                        const profile = profiles.value[memberEvent.sender]
                        if (!profile) continue
                        touchedUserIds.add(memberEvent.sender)
                        if (eventContentParse.data.avatarUrl != null) {
                            profile.avatarUrl = eventContentParse.data.avatarUrl
                        }
                        if (eventContentParse.data.displayname != null) {
                            profile.displayname = eventContentParse.data.displayname
                        }
                    }
                }
            }
        }
        if (sync.presence?.events) {
            for (const event of sync.presence.events) {
                if (!event.sender) continue
                if (event.type === 'm.presence') {
                    const eventContentParse = eventContentSchemaByType['m.presence']?.safeParse(event.content)
                    if (!eventContentParse?.success) return
                    if (!profiles.value[event.sender]) {
                        profiles.value[event.sender] = {
                            userId: event.sender,
                            currentlyActive: false,
                            presence: 'offline',
                        }
                    }
                    const profile = profiles.value[event.sender]
                    if (!profile) continue
                    touchedUserIds.add(event.sender)
                    if (eventContentParse.data.avatarUrl != null) {
                        profile.avatarUrl = eventContentParse.data.avatarUrl
                    }
                    if (eventContentParse.data.currentlyActive != null) {
                        profile.currentlyActive = eventContentParse.data.currentlyActive
                    }
                    if (eventContentParse.data.displayname != null) {
                        profile.displayname = eventContentParse.data.displayname
                    }
                    if (eventContentParse.data.lastActiveAgo != null) {
                        profile.lastActiveAgo = eventContentParse.data.lastActiveAgo
                    }
                    profile.presence = eventContentParse.data.presence
                    if (eventContentParse.data.statusMsg != null) {
                        profile.statusMessage = eventContentParse.data.statusMsg
                    }
                }
            }
        }
        if (isLeader.value) {
            for (const userId of touchedUserIds) {
                if (!profiles.value[userId]) continue
                try {
                    saveDiscortixTableKey('profiles', userId, toRaw(profiles.value[userId]))
                } catch (error) {
                    // Ignore, can call profile API later.
                }
            }
        }
    }

    async function populateFromUserSearchResponse(response: ApiV3UserDirectorySearchResponse) {
        let touchedUserIds = new Set<string>()
        for (const user of response.results) {
            if (!profiles.value[user.userId]) {
                profiles.value[user.userId] = {
                    userId: user.userId,
                    currentlyActive: false,
                    presence: 'offline',
                }
            }
            const profile = profiles.value[user.userId]
            if (!profile) continue
            touchedUserIds.add(user.userId)
            if (user.avatarUrl != null) {
                profile.avatarUrl = user.avatarUrl
            }
            if (user.displayName != null) {
                profile.displayname = user.displayName
            }
        }
        if (isLeader.value) {
            for (const userId of touchedUserIds) {
                if (!profiles.value[userId]) continue
                try {
                    saveDiscortixTableKey('profiles', userId, toRaw(profiles.value[userId]))
                } catch (error) {
                    // Ignore, can call profile API later.
                }
            }
        }
    }

    return {
        authenticatedUserAvatarUrl,
        authenticatedUserDisplayName,
        profiles: computed(() => profiles.value),
        profilesLoading,
        profilesLoadError,
        populateFromApiV3SyncResponse,
        populateFromUserSearchResponse,
    }
})
