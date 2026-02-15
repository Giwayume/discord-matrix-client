import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { i18n } from '@/i18n'

import './tailwind.css'
import 'primeicons/primeicons.css'
import './themes/dark/index.scss'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(PrimeVue)

app.mount('#app')
