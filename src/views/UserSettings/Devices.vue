<template>
    <div class="my-16 mx-auto max-w-174">
        <div class="px-3 py-2">
            <div v-html="micromark(t('userSettings.devices.instructions'))" class="gap-6 text-sm"></div>
        </div>
        <div class="px-3 py-2" v-if="loadErrorMessage">
            <Message severity="error" size="small" variant="simple">
                <template #icon>
                    <span class="pi pi-exclamation-circle !text-xs !leading-3 -mt-[1px]" aria-hidden="true" />
                </template>
                {{ loadErrorMessage }}
            </Message>
        </div>
        <template v-else>
            <section class="px-3 py-5" role="group" aria-labelledby="user-settings-devices-current-device-heading">
                <div id="user-settings-devices-current-device-heading" class="text-(--text-strong) text-xl mb-3">
                    {{ t('userSettings.devices.currentDeviceHeading') }}
                </div>
                <div class="py-4 flex gap-6 items-center">
                    <div class="user-settings__device-icon">
                        <span class="pi" :class="{ 'pi-desktop': !currentDevice?.isMobile, 'pi-mobile': currentDevice?.isMobile }" aria-hidden="true" />
                    </div>
                    <div class="user-settings__device-description">
                        <template v-if="loading">
                            <Skeleton width="5rem" class="mb-2"></Skeleton>
                            <Skeleton width="10rem"></Skeleton>
                        </template>
                        <template v-else-if="currentDevice">
                            <h3 class="text-(--text-strong) text-xs font-bold">
                                <span class="uppercase">{{ currentDevice.displayName ?? t('userSettings.devices.unnamedDevice') }}</span>
                                <span class="mx-1">·</span>
                                <span class="text-(--text-muted)">{{ currentDevice.deviceId.substring(0, 10) }}</span>
                            </h3>
                            <div class="text-(--text-strong) text-xs">
                                <a v-if="currentDevice.lastSeenIp" :href="'https://whatismyipaddress.com/ip/' + currentDevice.lastSeenIp" target="_blank">{{ currentDevice.lastSeenIp }}</a>
                                <span v-else>{{ t('userSettings.devices.unknownIp') }}</span>
                            </div>
                        </template>
                    </div>
                </div>
            </section>
            <section v-if="loading || otherDevices.length > 0" class="px-3 py-5" role="group" aria-labelledby="user-settings-devices-other-devices-heading">
                <div id="user-settings-devices-other-devices-heading" class="text-(--text-strong) text-xl mb-3">
                    {{ t('userSettings.devices.otherDevicesHeading') }}
                </div>
                <template v-if="loading">
                    <div class="user-settings__device">
                        <div class="user-settings__device-icon">
                            <span class="pi pi-desktop" aria-hidden="true" />
                        </div>
                        <div class="user-settings__device-description">
                            <Skeleton width="5rem" class="mb-2"></Skeleton>
                            <Skeleton width="10rem"></Skeleton>
                        </div>
                    </div>
                    <div class="user-settings__device">
                        <div class="user-settings__device-icon">
                            <span class="pi pi-desktop" aria-hidden="true" />
                        </div>
                        <div class="user-settings__device-description">
                            <Skeleton width="5rem" class="mb-2"></Skeleton>
                            <Skeleton width="10rem"></Skeleton>
                        </div>
                    </div>
                    <div class="user-settings__device">
                        <div class="user-settings__device-icon">
                            <span class="pi pi-desktop" aria-hidden="true" />
                        </div>
                        <div class="user-settings__device-description">
                            <Skeleton width="5rem" class="mb-2"></Skeleton>
                            <Skeleton width="10rem"></Skeleton>
                        </div>
                    </div>
                </template>
                <template v-else>
                    <div v-for="device of otherDevices" :key="device.deviceId" class="user-settings__device">
                        <div class="user-settings__device-icon">
                            <span class="pi" :class="{ 'pi-desktop': !device.isMobile, 'pi-mobile': device.isMobile }" aria-hidden="true" />
                        </div>
                        <div class="user-settings__device-description">
                            <template v-if="loading">
                                <Skeleton width="5rem" class="mb-2"></Skeleton>
                                <Skeleton width="10rem"></Skeleton>
                            </template>
                            <template v-else-if="device">
                                <h3 class="text-(--text-strong) text-xs font-bold">
                                    <span class="uppercase">{{ device.displayName ?? t('userSettings.devices.unnamedDevice') }}</span>
                                    <span class="mx-1">·</span>
                                    <span class="text-(--text-muted)">{{ device.deviceId.substring(0, 10) }}</span>
                                </h3>
                                <div class="text-(--text-strong) text-xs">
                                    <a v-if="device.lastSeenIp" :href="'https://whatismyipaddress.com/ip/' + device.lastSeenIp" target="_blank">{{ device.lastSeenIp }}</a>
                                    <span v-else>{{ t('userSettings.devices.unknownIp') }}</span>
                                    <span class="mx-1">·</span>
                                    <span>{{ timeAgo(device.lastSeenTs, t) }}</span>
                                </div>
                            </template>
                        </div>
                        <Button v-if="!loading" :aria-label="t('userSettings.devices.deleteDeviceButton')" icon="pi pi-times" severity="secondary" variant="text" class="!w-8 !h-8" @click="deleteDeviceStart(device)" />
                    </div>
                </template>
            </section>
            <section v-if="!loading" class="px-3 pb-5">
                <h2 class="font-medium text-(--text-primary)">{{ t('userSettings.devices.logOutAllHeading') }}</h2>
                <p class="text-sm text-(--text-subtle) !mt-0 !mb-6">{{ t('userSettings.devices.logOutAllDescription') }}</p>
                <Button :label="t('userSettings.devices.logOutAllButton')" severity="secondary" size="small" class="!text-(--text-feedback-critical)" />
            </section>
        </template>
    </div>
    <Dialog
        v-model:visible="deleteDeviceDialogVisible"
        modal
        :draggable="false"
        :style="{ width: 'calc(100% - 1rem)', maxWidth: '30rem' }"
    >
        <template #header>
            <div class="p-dialog-title">
                <template v-if="deleteError">
                    {{ t('userSettings.devices.deleteDevice.deleteErrorTitle') }}
                </template>
                <template v-else>
                    {{ t('userSettings.devices.deleteDevice.authenticationTitle') }}
                </template>
            </div>
        </template>
        <template v-if="deleteError">
            {{ t('userSettings.devices.deleteDevice.deleteErrorDescription') }}
        </template>
        <form v-else-if="deleteAuthenticationStep === 'm.login.password'" id="delete-device-password-auth-form" novalidate @submit.prevent="submitDeleteAuthenticationForm">
            <p class="text-sm text-(--text-muted)">{{ t('userSettings.devices.deleteDevice.authenticationDescription') }}</p>
            <div class="p-staticlabel flex flex-col gap-2 mt-5 mb-1">
                <label for="delete-device-auth-password" class="text-(--text-strong)">
                    {{ t('userSettings.devices.deleteDevice.passwordLabel') }}
                </label>
                <InputText
                    id="delete-device-auth-password"
                    v-model.trim="deleteFormAuthPasswordData.password" type="password"
                    :invalid="v$AuthPasswordForm.password.$invalid && v$AuthPasswordForm.$dirty"
                    required
                    autocomplete="off" autocorrect="off" autocapitalize="off"
                />
                <Message v-if="(v$AuthPasswordForm.password.$invalid && v$AuthPasswordForm.$dirty)" severity="error" size="small" variant="simple">
                    <template #icon>
                        <span class="pi pi-exclamation-circle !text-xs !leading-3 -mt-[1px]" aria-hidden="true" />
                    </template>
                    <template v-if="v$AuthPasswordForm.password.required.$invalid">
                        {{ t('userSettings.devices.deleteDevice.passwordRequired') }}
                    </template>
                    <template v-else>
                        {{ t('userSettings.devices.deleteDevice.passwordInvalid') }}
                    </template>
                </Message>
            </div>
        </form>
        <template v-else>
            {{ t('userSettings.devices.deleteDevice.authenticationMethodNotSupported') }}
        </template>
        <template #footer>
            <Button v-if="deleteAuthenticationStep === 'm.login.password'" type="submit" form="delete-device-password-auth-form" :loading="submittingDelete">
                {{ t('userSettings.devices.deleteDevice.authFormSubmitButton') }}
                <div class="p-button-loading-dots" />
            </Button>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { micromark } from 'micromark'

import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { timeAgo } from '@/utils/timing'
import { HttpError, ZodError } from '@/utils/error'

import { useDevices } from '@/composables/devices'

import { useSessionStore } from '@/stores/session'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'

import type {
    ApiV3DeviceResponse,
    ApiV3DeleteDeviceRequest,
    ApiV3DeleteDeviceAuthenticationResponse,
} from '@/types'

const { t } = useI18n()
const { getCurrentUserDevices, deleteDevice } = useDevices()
const { userId: sessionUserId, deviceId: sessionDeviceId } = storeToRefs(useSessionStore())

const loading = ref<boolean>(true)
const loadError = ref<Error | undefined>()
const currentDevice = ref<ApiV3DeviceResponse | undefined>()
const otherDevices = ref<ApiV3DeviceResponse[]>([])

const loadErrorMessage = computed<string | undefined>(() => {
    if (!loadError.value) return
    if (loadError.value instanceof ZodError) {
        return t('errors.schemaValidation')
    }
    return t('userSettings.devices.loadError.unknown')
})

onMounted(async () => {
    loading.value = true
    loadError.value = undefined
    try {
        const devices = (await getCurrentUserDevices()).devices ?? []
        currentDevice.value = devices.find((device) => device.deviceId === sessionDeviceId.value)
        otherDevices.value = devices
            .filter((device) => device.deviceId !== sessionDeviceId.value)
            .sort((a, b) => (a.lastSeenTs ?? 0) < (b.lastSeenTs ?? 0) ? 1 : -1)
        for (const otherDevice of otherDevices.value) {
            const displayName = (otherDevice.displayName ?? '').toLowerCase()
            otherDevice.isMobile = displayName.includes('android') || displayName.includes('ios')
        }
        if (!currentDevice.value) throw new Error('Current device not found.')
    } catch (error) {
        if (error instanceof Error) {
            loadError.value = error
        } else {
            loadError.value = new Error('A non-error object was thrown.')
        }
    } finally {
        loading.value = false
    }
})

/*-------------------*\
|                     |
|   Device Deletion   |
|                     |
\*-------------------*/

const deleteDeviceDialogVisible = ref<boolean>(false)
const deviceToDelete = ref<ApiV3DeviceResponse>()
const deleteAuthentication = ref<ApiV3DeleteDeviceAuthenticationResponse>()
const deleteError = ref<Error>()
const submittingDelete = ref<boolean>(false)

const deleteFormAuthPasswordData = reactive({
    password: '',
})
const isDeleteFormAuthPasswordInvalid = ref<boolean>(false)
const deleteFormAuthPasswordRules = {
    password: {
        required,
        invalid: () => !isDeleteFormAuthPasswordInvalid.value,
    },
}
const v$AuthPasswordForm = useVuelidate(deleteFormAuthPasswordRules, deleteFormAuthPasswordData)

const deleteAuthenticationStep = computed(() => {
    let preferredFlow: string | undefined = undefined
    for (const flow of deleteAuthentication.value?.flows ?? []) {
        if (flow.stages[0] === 'm.login.password' && !deleteAuthentication.value?.completed?.includes('m.login.password')) {
            preferredFlow = 'm.login.password'
        }
    }
    return preferredFlow
})

async function submitDeleteAuthenticationForm() {
    if (!deviceToDelete.value) return
    deleteDeviceStart(deviceToDelete.value)
}

async function deleteDeviceStart(device: ApiV3DeviceResponse) {
    deleteError.value = undefined

    if (!deleteDeviceDialogVisible.value) {
        deleteAuthentication.value = undefined
    }

    let auth: ApiV3DeleteDeviceRequest['auth'] | undefined = undefined
    if (deleteAuthenticationStep.value === 'm.login.password') {
        isDeleteFormAuthPasswordInvalid.value = false
        if (!await v$AuthPasswordForm.value.$validate()) return
        auth = {
            session: deleteAuthentication.value?.session,
            type: 'm.login.password',
            identifier: {
                type: 'm.id.user',
                user: sessionUserId.value,
            },
            password: deleteFormAuthPasswordData.password,
        }
    }

    let isDeleteSuccess = false
    submittingDelete.value = true
    try {
        await deleteDevice(device.deviceId, auth)
        isDeleteSuccess = true
    } catch (error) {
        if (error instanceof HttpError) {
            if (error.status === 401) {
                if (deleteAuthenticationStep.value === 'm.login.password') {
                    isDeleteFormAuthPasswordInvalid.value = true
                }
                deleteAuthentication.value = await error.responseBody
            } else if (deleteAuthenticationStep.value === 'm.login.password') {
                isDeleteFormAuthPasswordInvalid.value = true
            } else {
                deleteError.value = error
            }
        } else {
            deleteError.value = new Error('The thrown object was not an error.')
        }
    } finally {
        submittingDelete.value = false
    }

    if (isDeleteSuccess) {
        const deviceIndex = otherDevices.value.findIndex((device) => device.deviceId === deviceToDelete.value?.deviceId)
        if (deviceIndex > -1) {
            otherDevices.value.splice(deviceIndex, 1)
        }
        deleteDeviceDialogVisible.value = false
    } else if (!deleteDeviceDialogVisible.value) {
        deleteFormAuthPasswordData.password = ''
        v$AuthPasswordForm.value.$reset()

        deviceToDelete.value = device
        deleteDeviceDialogVisible.value = true
    }
}

</script>

<style lang="scss" scoped>
:deep(p) {
    margin: 1rem 0;

    &:first-child {
        margin-top: 0;
    }

    &:last-child {
        margin-bottom: 0;
    }
}

.user-settings__device {
    border-bottom: thin solid var(--border-subtle);
    padding: 1rem 0 1.5rem 0;
    display: flex;
    gap: 1.5rem;
    align-items: center;

    + .user-settings__device {
        padding-top: 1.5rem;
    }
}
.user-settings__device-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--interactive-text-default);
    color: var(--background-base-lower);
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    flex-shrink: 0;
}
.user-settings__device-description {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-grow: 1;
    min-height: 2.625rem;
    white-space: break-all;
    overflow: hidden;
}
</style>