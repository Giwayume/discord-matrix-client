import { defineAsyncComponent } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            name: 'landing',
            path: '/',
            component: () => import('@/views/Landing.vue'),
        },
        {
            name: 'login',
            path: '/login',
            component: () => import('@/views/Login.vue'),
        },
        {
            name: 'register',
            path: '/register',
            component: () => import('@/views/Register.vue'),
        },
        {
            name: 'forgot-password',
            path: '/forgot-password',
            component: () => import('@/views/ForgotPassword.vue'),
        },
        {
            name: 'home',
            path: '/home',
            component: () => import('@/views/Home.vue'),
        },
        {
            name: 'room',
            path: '/room/:roomId',
            component: () => import('@/views/Room.vue'),
            props: (route) => {
                return {
                    roomId: route.params.roomId,
                }
            },
        },
    ],
})

export default router
