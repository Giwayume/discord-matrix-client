<template>
    <div class="p-staticlabel flex flex-col gap-2 mt-5">
        <label for="login-username" class="text-(--text-strong)">{{ t('login.usernameLabel') }}</label>
        <InputText id="login-username" v-model.trim="formData.username" type="text" :invalid="v$.username.$invalid && v$.$dirty" required autocomplete="off" />
        <Message v-if="(v$.username.$invalid && v$.$dirty) || usernameOrPasswordInvalid" severity="error" size="small" variant="simple">
            <template #icon>
                <span class="pi pi-exclamation-circle !text-xs !leading-3 -mt-[1px]" aria-hidden="true" />
            </template>
            <template v-if="v$.username.required.$invalid">
                {{ t('login.usernameRequired') }}
            </template>
            <template v-else>
                {{ t('login.invalidUsernameOrPassword') }}
            </template>
        </Message>
    </div>
    <div class="p-staticlabel flex flex-col gap-2 mt-5">
        <label for="login-password" class="text-(--text-strong)">{{ t('login.passwordLabel') }}</label>
        <InputText id="login-password" v-model.trim="formData.password" type="password" :invalid="v$.password.$invalid && v$.$dirty" required />
        <Message v-if="(v$.password.$invalid && v$.$dirty) || usernameOrPasswordInvalid" severity="error" size="small" variant="simple">
            <template #icon>
                <span class="pi pi-exclamation-circle !text-xs !leading-3 -mt-[1px]" aria-hidden="true" />
            </template>
            <template v-if="v$.password.required.$invalid">
                {{ t('login.passwordRequired') }}
            </template>
            <template v-else>
                {{ t('login.invalidUsernameOrPassword') }}
            </template>
        </Message>
    </div>
    <RouterLink :to="{ name: 'forgot-password' }" class="text-sm mt-1">{{ t('login.forgotPasswordLink') }}</RouterLink>
    <Button type="submit" :loading="props.loading" class="w-full mt-5">
        {{ t('login.loginButton') }}
        <div class="p-button-loading-dots" />
    </Button>
    <Message v-if="loginErrorMessage" severity="error" variant="simple" class="mt-2">
        {{ loginErrorMessage }}
    </Message>
    <p class="text-sm mt-2">
        {{ t('login.registerPrompt') }}
        <RouterLink :to="{ name: 'register' }">{{ t('login.registerLink') }}</RouterLink>
    </p>
</template>

<script setup lang="ts">
import { computed, reactive, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'

import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { HttpError } from '@/utils/fetch'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'

import type { LoginFormData } from '@/composables/login'

const { t } = useI18n()

const props = defineProps({
    loading: {
        type: Boolean,
        default: false,
    },
    loginError: {
        type: Error as PropType<Error | null>,
        default: null,
    },
    modelValue: {
        type: Object as PropType<LoginFormData>,
        default: () => {},
    },
})

const emit = defineEmits<{
    (e: 'update:formData', formData: LoginFormData): void
}>()

const usernameOrPasswordInvalid = computed(() => {
    if (!props.loginError) return false
    return (
        props.loginError instanceof HttpError
        && (
            props.loginError.isMatrixForbidden()
            || props.loginError.isMatrixNotFound()
        )
    )
})

const loginErrorMessage = computed(() => {
    if (!props.loginError || usernameOrPasswordInvalid.value) return null
    if (props.loginError instanceof HttpError) {
        if (props.loginError.isMatrixRateLimited()) {
            return t('errors.rateLimited')
        } else if (props.loginError.isMatrixUserDeactivated()) {
            return t('login.userDeactivated')
        }
    }
    return t('errors.unexpected')
})

const formData = reactive({
    username: '',
    password: '',
})

watch(() => formData, () => {
    emit('update:formData', formData)
}, { deep: true })

const formRules = {
    username: { required },
    password: { required },
}

const v$ = useVuelidate(formRules, formData)

</script>