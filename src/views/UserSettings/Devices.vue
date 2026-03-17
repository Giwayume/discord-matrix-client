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
                        <Button v-if="!loading" :aria-label="t('userSettings.devices.deleteDeviceButton')" icon="pi pi-times" severity="secondary" variant="text" class="!w-8 !h-8" />
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
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { micromark } from 'micromark'

import { timeAgo } from '@/utils/timing'
import { ZodError } from '@/utils/error'

import { useDevices } from '@/composables/devices'

import { useSessionStore } from '@/stores/session'

import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'

import type { ApiV3DeviceResponse } from '@/types'

const { t } = useI18n()
const { getCurrentUserDevices } = useDevices()
const { deviceId: sessionDeviceId } = storeToRefs(useSessionStore())

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