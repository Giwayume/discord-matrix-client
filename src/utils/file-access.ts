
export interface PickFileOptions {
    multiple?: boolean;
    types?: Array<{
        description?: string;
        accept: Record<string, string[]>
    }>;
}

export interface PickFileOptionsMultiple extends PickFileOptions {
    multiple: true;
}

export function pickFile(options?: PickFileOptionsMultiple): Promise<File[]>
export function pickFile(options?: PickFileOptions): Promise<File>
export function pickFile(options: PickFileOptions = {}): any {
    // File System Access API (Chromium‑based browsers)
    if ((window as any).showOpenFilePicker) {
        return (window as any).showOpenFilePicker(options)
            .then((handles: any) => handles[0])
            .then((handle: any) => handle.getFile())
    }

    // Fallback to the file input element
    return new Promise((resolve, reject) => {
        let input = document.getElementById('fallback-file-input') as HTMLInputElement | null
        if (!input) {
            input = document.createElement('input')
            input.setAttribute('type', 'file')
            input.id = 'fallback-file-input'
            input.style.display = 'none'
            document.body.appendChild(input)
        }

        if (options.types && options.types.length) {
            const accept = options.types
                .map(t => Object.entries(t.accept || {})
                .map(([mime, exts]) => exts.map(e => `.${e.replace(/^\./, '')}`).join(','))
                .join(','))
                .join(',')
            input.setAttribute('accept', accept)
        }
        input.setAttribute('multiple', !!options.multiple + '')

        const clean = () => {
            input.value = ''
            input.removeEventListener('change', onChange)
        };

        const onChange = () => {
            if (input.files?.length === 0) return reject(new DOMException('No file selected', 'AbortError'))
            if (options.multiple) {
                resolve(input.files)
            } else {
                resolve(input.files?.[0])
            }
            clean()
        };

        input.addEventListener('change', onChange)
        input.click()
    });
}
