import { readonly } from 'vue'
import { defineStore } from 'pinia'
import config from '../../config.json'

export const useConfigStore = defineStore('config', () => {
    const buildConfig = readonly(config)

    return { buildConfig }
})