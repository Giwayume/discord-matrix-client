import { storeToRefs } from 'pinia'
import { type ZodType } from 'zod'
import { camelizeApiResponse } from '@/utils/zod'

import { useAccountDataStore } from '@/stores/account-data'
import { useSessionStore } from '@/stores/session'

import { fetchJson } from '@/utils/fetch'

import { eventContentSchemaByType } from '@/types'

export function useAccountData() {
    const { homeserverBaseUrl, userId } = storeToRefs(useSessionStore())
    const { populateByType: populateAccountDataByType } = useAccountDataStore()

    async function getAccountDataByType<T = any>(type: string, schema?: ZodType, camelize?: boolean): Promise<T | undefined> {
        try {
            let response = await fetchJson(
                `${homeserverBaseUrl.value}/_matrix/client/v3/user/${encodeURIComponent(userId.value + '')}/account_data/${type}`,
                {
                    useAuthorization: true,
                },
            )
            if (camelize !== false) {
                response = camelizeApiResponse(response)
            }
            const validationSchema = schema ?? eventContentSchemaByType[type as keyof typeof eventContentSchemaByType]
            if (validationSchema && !validationSchema.safeParse(response)) {
                return undefined
            }
            populateAccountDataByType(type, response)
            return response
        } catch (error) {
            return undefined
        }
    }

    async function setAccountDataByType(type: string, data: any): Promise<void> {
        await fetchJson(
            `${homeserverBaseUrl.value}/_matrix/client/v3/user/${encodeURIComponent(userId.value + '')}/account_data/${type}`,
            {
                method: 'PUT',
                body: JSON.stringify(data),
                useAuthorization: true,
            },
        )
        const camelizedData = camelizeApiResponse(data)
        populateAccountDataByType(type, camelizedData)
    }

    return {
        getAccountDataByType,
        setAccountDataByType,
    }
}