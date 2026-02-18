import { storeToRefs } from 'pinia'
import { useI18n, type ComposerTranslation } from 'vue-i18n'
import { fetchJson } from '@/utils/fetch'
import { MissingSessionDataError } from '@/utils/error'

import { useSessionStore } from '@/stores/session'
import { useProfileStore } from '@/stores/profile'

import { ApiV3ProfileResponseSchema, type ApiV3ProfileResponse } from '@/types'

function getFriendlyErrorMessage(t: ComposerTranslation, error: Error | unknown) {
    if (error instanceof MissingSessionDataError) {
        return t('errors.profiles.missingSessionData')
    }
    return t('errors.unexpected')
}

export function useProfiles() {
    const { t } = useI18n()
    const { homeserverBaseUrl, userId } = storeToRefs(useSessionStore())
    const { authenticatedUserAvatarUrl, authenticatedUserDisplayName } = storeToRefs(useProfileStore())

    async function getProfile(userId: string) {
        return fetchJson<ApiV3ProfileResponse>(
            `${homeserverBaseUrl.value}/_matrix/client/v3/profile/${encodeURIComponent(userId)}`,
            {
                useAuthorization: true,
                jsonSchema: ApiV3ProfileResponseSchema,
            },
        )
    }

    async function initialize() {
        if (!userId.value) throw new MissingSessionDataError('User ID is missing.')
        try {
            const { avatarUrl, displayname } = await getProfile(userId.value)
            authenticatedUserAvatarUrl.value = avatarUrl
            authenticatedUserDisplayName.value = displayname
        } catch (_) {
            // Ignore. None of this profile data is required.
        }
    }

    return {
        getFriendlyErrorMessage: (error: Error | unknown) => getFriendlyErrorMessage(t, error),
        getProfile,
        initialize
    }
}
