<template>
    <p class="text-(--text-strong) mt-5 mb-2">{{ t('register.guestRegistrationAllowed') }}</p>
    <SelectButton v-model="registerKind" :options="['guest', 'user']" class="w-full">
        <template #option="slotProps">
            <div class="flex flex-col gap-2 h-full">
                <span :class="t(`register.kind.${slotProps.option}.icon`)" class="text-2xl!" aria-hidden="true" />
                <div class="text-md">{{ t(`register.kind.${slotProps.option}.title`) }}</div>
                <div class="text-xs">{{ t(`register.kind.${slotProps.option}.subtitle`) }}</div>
            </div>
        </template>
    </SelectButton>
    <Button type="button" class="w-full mt-5" @click="emit('update:registerKind', registerKind)">
        {{ t('register.continueButton') }}
        <div class="p-button-loading-dots" />
    </Button>
    <p class="text-sm mt-5">
        <RouterLink :to="{ name: 'login' }">{{ t('register.loginLink') }}</RouterLink>
    </p>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'

const { t } = useI18n()

const emit = defineEmits<{
    (e: 'update:registerKind', registerKind: 'guest' | 'user'): void
}>()

const registerKind = ref<'guest' | 'user'>('guest')
</script>