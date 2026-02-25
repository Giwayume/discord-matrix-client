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
} from '@/types'

interface UserProfile {
    avatarUrl?: string;
    currentlyActive: boolean;
    displayname?: string;
    lastActiveAgo?: number;
    presence: 'online' | 'offline' | 'unavailable';
    statusMessage?: string;
}

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
        if (sync.presence?.events) {
            for (const event of sync.presence.events) {
                if (!event.sender) continue
                if (event.type === 'm.presence') {
                    const eventContentParse = eventContentSchemaByType['m.presence']?.safeParse(event.content)
                    if (!eventContentParse?.success) return
                    if (!profiles.value[event.sender]) {
                        profiles.value[event.sender] = {
                            currentlyActive: false,
                            presence: 'offline',
                        }
                    }
                    const profile = profiles.value[event.sender]
                    if (!profile) continue
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

                    if (isLeader.value) {
                        try {
                            saveDiscortixTableKey('profiles', event.sender, toRaw(profile))
                        } catch (error) {
                            // Ignore, can call profile API later.
                        }
                    }
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
    }
})
