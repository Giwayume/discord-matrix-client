/**
 * General storage for data that we have reformatted from element-web.
 */

let database: IDBDatabase | null = null;

async function init(): Promise<void> {
    // Throws an error in some cases if disabled
    const indexedDB = self?.indexedDB ? self.indexedDB : window.indexedDB
    if (!indexedDB) {
        throw new Error('IndexedDB not available')
    }
    database = await new Promise((resolve, reject) => {
        const request = indexedDB.open('discortix', 1)
        request.onerror = reject
        request.onsuccess = (): void => {
            resolve(request.result)
        }
        request.onupgradeneeded = (): void => {
            const db = request.result
            db.createObjectStore('4s')
            db.createObjectStore('accountData')
            db.createObjectStore('clientSettings')
            db.createObjectStore('profiles')
            db.createObjectStore('rooms')
            db.createObjectStore('roomKeys')
        }
    })
}

async function runTransaction(
    table: string,
    mode: IDBTransactionMode,
    fn: (objectStore: IDBObjectStore) => IDBRequest<any>,
): Promise<any> {
    if (!database) {
        await init()
    }
    return new Promise((resolve, reject) => {
        const transaction = database!.transaction([table], mode)
        transaction.onerror = reject

        const objectStore = transaction.objectStore(table)
        const request = fn(objectStore)
        request.onerror = reject
        request.onsuccess = (): void => {
            resolve(request.result)
        }
    })
}

export async function getAllTableKeys(table: string): Promise<any> {
    if (!database) {
        await init()
    }
    return runTransaction(table, 'readonly', (objectStore) => objectStore.getAllKeys())
}

export async function loadTableKey(table: string, key: string | string[]): Promise<any> {
    if (!database) {
        await init()
    }
    return runTransaction(table, 'readonly', (objectStore) => objectStore.get(key))
}

export async function saveTableKey(table: string, key: string | string[], data: any): Promise<void> {
    if (!database) {
        await init()
    }
    return runTransaction(table, 'readwrite', (objectStore) => objectStore.put(data, key))
}

export async function deleteTableKey(table: string, key: string | string[]): Promise<void> {
    if (!database) {
        await init()
    }
    return runTransaction(table, 'readwrite', (objectStore) => objectStore.delete(key))
}

export async function clearTable(table: string): Promise<void> {
    if (!database) {
        await init()
    }
    return runTransaction(table, 'readwrite', (objectStore) => objectStore.clear())
}
