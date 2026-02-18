<template>
    <Application :title="t('home.title')" titleIcon="pi pi-users">
        Home
    </Application>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import Application from './Layout/Application.vue'

const { t } = useI18n()

</script>