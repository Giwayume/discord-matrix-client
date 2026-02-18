<template>
    <div class="p-staticlabel flex flex-col gap-2 mt-5">
        <label for="register-username" class="text-(--text-strong)">{{ t('register.usernameLabel') }}</label>
        <InputText id="register-username" v-model.trim="formData.username" type="text" :invalid="v$.username.$invalid && v$.$dirty" required autocomplete="off" />
        <Message v-if="(v$.username.$invalid && v$.$dirty)" severity="error" size="small" variant="simple">
            <template #icon>
                <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="transparent" class=""></circle><path fill="var(--text-feedback-critical)" fill-rule="evenodd" d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm1.44-15.94L13.06 14a1.06 1.06 0 0 1-2.12 0l-.38-6.94a1 1 0 0 1 1-1.06h.88a1 1 0 0 1 1 1.06Zm-.19 10.69a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" clip-rule="evenodd" class=""></path></svg>
            </template>
            <template v-if="v$.username.required.$invalid">
                {{ t('register.usernameRequired') }}
            </template>
            <template v-if="v$.username.taken.$invalid">
                {{ t('register.usernameTaken') }}
            </template>
            <template v-else>
                {{ t('register.usernameInvalid') }}
            </template>
        </Message>
    </div>
    <div class="p-staticlabel flex flex-col gap-2 mt-5">
        <label for="register-password" class="text-(--text-strong)">{{ t('register.passwordLabel') }}</label>
        <InputText id="register-password" v-model.trim="formData.password" type="password" :invalid="v$.password.$invalid && v$.$dirty" required autocomplete="off" />
        <Message v-if="(v$.password.$invalid && v$.$dirty)" severity="error" size="small" variant="simple">
            <template #icon>
                <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="transparent" class=""></circle><path fill="var(--text-feedback-critical)" fill-rule="evenodd" d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm1.44-15.94L13.06 14a1.06 1.06 0 0 1-2.12 0l-.38-6.94a1 1 0 0 1 1-1.06h.88a1 1 0 0 1 1 1.06Zm-.19 10.69a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" clip-rule="evenodd" class=""></path></svg>
            </template>
            <template v-if="v$.password.required.$invalid">
                {{ t('register.passwordRequired') }}
            </template>
            <template v-else>
                {{ t('register.passwordInvalid') }}
            </template>
        </Message>
    </div>
    <Button type="submit" :loading="props.loading" class="w-full mt-5">
        {{ t('register.createAccountButton') }}
        <div class="p-button-loading-dots" />
    </Button>
    <p class="text-sm mt-5">
        <RouterLink :to="{ name: 'login' }">{{ t('register.loginLink') }}</RouterLink>
    </p>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'

import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'

import type { RegisterFormData } from '@/composables/register'

const { t } = useI18n()

const props = defineProps({
    loading: {
        type: Boolean,
        default: false,
    },
    takenUsernames: {
        type: Array as PropType<string[]>,
        default: () => [],
    }
})

const emit = defineEmits<{
    (e: 'update:formData', formData: RegisterFormData): void
}>()

const takenUsernames = ref<string[]>([])
watch(() => props.takenUsernames, () => {
    takenUsernames.value = props.takenUsernames
}, { immediate: true })

const formData = reactive({
    username: '',
    password: '',
})

watch(() => formData, () => {
    emit('update:formData', formData)
}, { deep: true })

const formRules = {
    username: {
        required,
        taken: () => {
            return !takenUsernames.value.includes(formData.username)
        },
    },
    password: {
        required,
    },
}

const v$ = useVuelidate(formRules, formData)
</script>