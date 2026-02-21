const debug = (importMetaUrl: string, ...args: any) => {
    console.debug(new Date().toISOString() + '::' + importMetaUrl + ' ', ...args)
}

const info = (importMetaUrl: string, ...args: any) => {
    console.info(new Date().toISOString() + '::' + importMetaUrl + ' ', ...args)
}

const log = (importMetaUrl: string, ...args: any) => {
    console.log(new Date().toISOString() + '::' + importMetaUrl + ' ', ...args)
}

const warn = (importMetaUrl: string, ...args: any) => {
    console.warn(new Date().toISOString() + '::' + importMetaUrl + ' ', ...args)
}

const error = (importMetaUrl: string, ...args: any) => {
    console.error(new Date().toISOString() + '::' + importMetaUrl + ' ', ...args)
}

export function createLogger(importMetaUrl: string) {
    return {
        debug: (...args: any) => debug(importMetaUrl, ...args),
        info: (...args: any) => info(importMetaUrl, ...args),
        log: (...args: any) => log(importMetaUrl, ...args),
        warn: (...args: any) => warn(importMetaUrl, ...args),
        error: (...args: any) => error(importMetaUrl, ...args),
    }
}
