<template>
    <Application key="mainApplication" :title="t('home.title')" titleIcon="pi pi-users">
        <template #sidebar-list>
            <SidebarListDirectMessages />
        </template>
        <MainHeader>
            <div class="flex pl-4 py-2 pr-2 items-center">
                <span class="pi pi-user w-8 text-center text-(--channel-icon)" />
                <h1 class="font-medium text-(--text-strong) mr-2">{{ t('home.title') }}</h1>
                <div class="rounded-full w-1 h-1 bg-(--border-subtle)"></div>
            </div>
        </MainHeader>
    </Application>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import Application from './Layout/Application.vue'
import MainHeader from './Layout/MainHeader.vue'
import SidebarListDirectMessages from './Layout/SidebarListDirectMessages.vue'

const { t } = useI18n()

</script>