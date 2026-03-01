import { createApp, getCurrentInstance, nextTick } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import VueDOMPurifyHTML from 'vue-dompurify-html'
import { useMediaCache } from '@/composables/media-cache'
import { v4 as uuidv4 } from 'uuid'

import './tailwind.css'
import 'primeicons/primeicons.css'
import './themes/dark/index.scss'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const mediaCacheByTimelineId: Record<string, ReturnType<typeof useMediaCache>> = {}

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(PrimeVue)
app.use(ToastService)
app.use(VueDOMPurifyHTML, {
    default: {
        ALLOWED_TAGS: ['del', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol', 'sup', 'sub', 'li', 'b', 'i', 'u', 'strong', 'em', 's', 'code', 'hr', 'br', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption', 'pre', 'span', 'img', 'details', 'summary'],
        ADD_ATTR: (attributeName: string, tagName: string) => {
            return attributeName !== 'style' && attributeName !== 'class'
        },
    },
    namedConfigurations: {
        svg: {
            USE_PROFILES: { svg: true },
        },
        mathml: {
            USE_PROFILES: { mathMl: true },
        },
    },
    hooks: {
        uponSanitizeElement: (currentNode: HTMLElement) => {
            const instance = getCurrentInstance()
            if (currentNode?.tagName === 'IMG') {
                const mxcUri = currentNode.getAttribute('src')
                if (!mxcUri?.startsWith('mxc://')) return
                const imageId = `sanitized-img-${uuidv4()}`
                currentNode.setAttribute('id', imageId)
                currentNode.setAttribute('src', '/assets/images/image-loading.png')
                nextTick(() => {
                    const timelineId = document.querySelector('[data-timeline-id]')?.getAttribute('data-timeline-id')
                    if (!timelineId) return
                    let mediaCacheEntries = mediaCacheByTimelineId[timelineId]
                    if (!mediaCacheEntries) {
                        mediaCacheByTimelineId[timelineId] = useMediaCache()
                        mediaCacheEntries = mediaCacheByTimelineId[timelineId]
                    }
                    mediaCacheEntries.getMxcObjectUrl(mxcUri, { type: 'thumbnail', width: 96, height: 96, method: 'scale' }).then((src) => {
                        const img = document.getElementById(imageId)
                        if (!img) return
                        img.setAttribute('src', src)
                        if (!img.parentElement) return
                        const hasOnlyImg = img.parentElement.childElementCount === 1 &&
                            img.parentElement.firstElementChild?.tagName === 'IMG' &&
                            img.parentElement.textContent.trim() === ''
                        img.classList.toggle('p-chattimeline-event-jumbo-emoji', hasOnlyImg)
                    }).catch((error) => {
                        document.getElementById(imageId)?.setAttribute('src', '/assets/images/image-load-error.svg')
                    })
                })
            }
        },
    },
})

app.mount('#app')

window.addEventListener('discortix-timeline-unmounted', (event: Event) => {
    if (!(event instanceof CustomEvent)) return
    if (!event.detail.id) return
    let mediaCacheEntries = mediaCacheByTimelineId[event.detail.id]
    if (!mediaCacheEntries) return
    mediaCacheEntries.clearUsers()
})

// Prevent zooming with more than one finger
document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault()
    }
}, { passive: false });

// Prevent pinch zooming with gestures
document.addEventListener('gesturestart', function(e) {
    e.preventDefault()
}, { passive: false })