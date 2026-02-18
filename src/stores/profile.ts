import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useProfileStore = defineStore('profile', () => {

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

    return {
        authenticatedUserAvatarUrl,
        authenticatedUserDisplayName,
    }
})
