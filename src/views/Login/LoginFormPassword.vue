<template>
    <div class="p-staticlabel flex flex-col gap-2 mt-5">
        <label for="login-username" class="text-(--text-strong)">{{ t('login.usernameLabel') }}</label>
        <InputText id="login-username" v-model="formData.username" type="text" :invalid="v$.username.$invalid && v$.$dirty" required autocomplete="off" />
        <Message v-if="(v$.username.$invalid && v$.$dirty) || usernameOrPasswordInvalid" severity="error" size="small" variant="simple">
            <template #icon>
                <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="transparent" class=""></circle><path fill="var(--text-feedback-critical)" fill-rule="evenodd" d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm1.44-15.94L13.06 14a1.06 1.06 0 0 1-2.12 0l-.38-6.94a1 1 0 0 1 1-1.06h.88a1 1 0 0 1 1 1.06Zm-.19 10.69a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" clip-rule="evenodd" class=""></path></svg>
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
        <InputText id="login-password" v-model="formData.password" type="password" :invalid="v$.password.$invalid && v$.$dirty" required />
        <Message v-if="(v$.password.$invalid && v$.$dirty) || usernameOrPasswordInvalid" severity="error" size="small" variant="simple">
            <template #icon>
                <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="transparent" class=""></circle><path fill="var(--text-feedback-critical)" fill-rule="evenodd" d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm1.44-15.94L13.06 14a1.06 1.06 0 0 1-2.12 0l-.38-6.94a1 1 0 0 1 1-1.06h.88a1 1 0 0 1 1 1.06Zm-.19 10.69a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" clip-rule="evenodd" class=""></path></svg>
            </template>
            <template v-if="v$.password.required.$invalid">
                {{ t('login.passwordRequired') }}
            </template>
            <template v-else>
                {{ t('login.invalidUsernameOrPassword') }}
            </template>
        </Message>
    </div>
    <router-link :to="{ name: 'forgot-password' }" class="text-sm mt-1">{{ t('login.forgotPasswordLink') }}</router-link>
    <Button type="submit" :loading="props.loading" class="w-full mt-5">
        {{ t('login.loginButton') }}
        <div class="p-button-loading-dots" />
    </Button>
    <Message v-if="loginErrorMessage" severity="error" variant="simple" class="mt-2">
        {{ loginErrorMessage }}
    </Message>
    <p class="text-sm mt-2">
        {{ t('login.registerPrompt') }}
        <router-link :to="{ name: 'register' }">{{ t('login.registerLink') }}</router-link>
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