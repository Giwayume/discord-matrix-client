/** @see https://spec.matrix.org/v1.17/appendices/#canonical-json */

const escaped = /[\\\"\x00-\x1F]/g
const escapes: Record<string, string> = {}

for (let i = 0; i < 0x20; ++i) {
    escapes[String.fromCharCode(i)] = (
        '\\U' + ('0000' + i.toString(16)).slice(-4).toUpperCase()
    )
}

escapes['\b'] = '\\b'
escapes['\t'] = '\\t'
escapes['\n'] = '\\n'
escapes['\f'] = '\\f'
escapes['\r'] = '\\r'
escapes['\"'] = '\\\"'
escapes['\\'] = '\\\\'

function escapeString(value: string) {
    escaped.lastIndex = 0;
    return value.replace(escaped, function(c) { return escapes[c] ?? '' })
}

function stringifyArray(array: any[]) {
    let sep = '['
    let result = ''
    for (let i = 0; i < array.length; ++i) {
        result += sep
        sep = ','
        result += stringify(array[i])
    }
    if (sep != ',') {
        return '[]'
    } else {
        return result + ']'
    }
}

function stringifyObject(object: Record<string, any>, omitKeys: string[] = []) {
    let sep = '{'
    let result = ''
    const keys = Object.keys(object)
    keys.sort()
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i] as string
        if (omitKeys.includes(key as string)) continue
        result += sep + '"' + escapeString(key) + '":'
        sep = ','
        result += stringify(object[key])
    }
    if (sep != ',') {
        return '{}'
    } else {
        return result + '}'
    }
}

export function stringify(value: any, omitKeys: string[] = []): string {
    switch (typeof value) {
        case 'string':
            return '"' + escapeString(value) + '"'
        case 'number':
            return isFinite(value) ? value + '' : 'null'
        case 'boolean':
            return value + ''
        case 'object':
            if (value === null) {
                return 'null'
            }
            if (Array.isArray(value)) {
                return stringifyArray(value)
            }
            return stringifyObject(value, omitKeys)
        default:
            throw new Error('Cannot stringify: ' + typeof value)
    }
}

