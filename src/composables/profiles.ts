import { storeToRefs } from 'pinia'
import { useI18n, type ComposerTranslation } from 'vue-i18n'
import { fetchJson } from '@/utils/fetch'
import { MissingSessionDataError } from '@/utils/error'

import { useSessionStore } from '@/stores/session'
import { useProfileStore } from '@/stores/profile'

import {
    ApiV3ProfileResponseSchema, type ApiV3ProfileResponse,
    ApiV3UserDirectorySearchResponseSchema, type ApiV3UserDirectorySearchResponse, type ApiV3UserDirectorySearchRequest, 
} from '@/types'

function getFriendlyErrorMessage(t: ComposerTranslation, error: Error | unknown) {
    if (error instanceof MissingSessionDataError) {
        return t('errors.profiles.missingSessionData')
    }
    return t('errors.unexpected')
}

export function useProfiles() {
    const { t } = useI18n()
    const { homeserverBaseUrl, userId } = storeToRefs(useSessionStore())
    const profileStore = useProfileStore()
    const { authenticatedUserAvatarUrl, authenticatedUserDisplayName } = storeToRefs(profileStore)
    const { populateFromUserSearchResponse } = profileStore

    async function getProfile(userId: string, abortController?: AbortController) {
        return fetchJson<ApiV3ProfileResponse>(
            `${homeserverBaseUrl.value}/_matrix/client/v3/profile/${encodeURIComponent(userId)}`,
            {
                signal: abortController?.signal,
                useAuthorization: true,
                jsonSchema: ApiV3ProfileResponseSchema,
            },
        )
    }

    async function searchUserDirectory(searchTerm: string, abortController?: AbortController) {
        const request: ApiV3UserDirectorySearchRequest = {
            limit: 10,
            search_term: searchTerm,
        }
        const response = await fetchJson<ApiV3UserDirectorySearchResponse>(
            `${homeserverBaseUrl.value}/_matrix/client/v3/user_directory/search`,
            {
                method: 'POST',
                signal: abortController?.signal,
                body: JSON.stringify(request),
                useAuthorization: true,
                jsonSchema: ApiV3UserDirectorySearchResponseSchema,
            }
        )
        // populateFromUserSearchResponse(response)
        return response
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
        searchUserDirectory,
        initialize
    }
}
