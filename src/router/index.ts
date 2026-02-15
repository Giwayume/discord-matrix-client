import { defineAsyncComponent } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            name: 'login',
            path: '/login',
            component: defineAsyncComponent(() => import('@/views/Login.vue')),
        },
        {
            name: 'register',
            path: '/register',
            component: defineAsyncComponent(() => import('@/views/Register.vue')),
        },
        {
            name: 'forgot-password',
            path: '/forgot-password',
            component: defineAsyncComponent(() => import('@/views/ForgotPassword.vue')),
        }
    ],
})

export default router
