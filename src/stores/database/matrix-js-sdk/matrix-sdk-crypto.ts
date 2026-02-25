/**
 * Following the format of the matrix-js-sdk storage, but not using their code.
 */

let database: IDBDatabase | null = null;

async function init(): Promise<void> {
    // Throws an error in some cases if disabled
    const indexedDB = self?.indexedDB ? self.indexedDB : window.indexedDB
    if (!indexedDB) {
        throw new Error('IndexedDB not available')
    }
    database = await new Promise((resolve, reject) => {
        const request = indexedDB.open('matrix-js-sdk::matrix-sdk-crypto', 1)
        request.onerror = reject
        request.onsuccess = (): void => {
            resolve(request.result)
        }
        request.onupgradeneeded = (): void => {
            const db = request.result
            db.createObjectStore('backup_keys')
            db.createObjectStore('core')
            db.createObjectStore('devices')
            db.createObjectStore('direct_withheld_info')
            db.createObjectStore('gossip_requests')
            db.createObjectStore('identities')
            db.createObjectStore('inbound_group_sessions3')
            db.createObjectStore('olm_hashes')
            db.createObjectStore('outbound_group_sessions')
            db.createObjectStore('room_settings')
            db.createObjectStore('secrets_inbox')
            db.createObjectStore('session')
            db.createObjectStore('tracked_users')
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
