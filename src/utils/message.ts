import { micromark } from 'micromark'
import { replaceSpoilers, spoilerSyntax, spoilerHtml } from '@/utils/micromark'
import linkifyHtml from 'linkify-html'
import type { ComposerTranslation } from 'vue-i18n'

import type { EmojiPickerEmojiItem } from '@/types'

export function formatMessage(
    message: string,
    currentRoomCustomEmojiByCode: Record<string, EmojiPickerEmojiItem>,
    t: ComposerTranslation
) {
    let html = micromark(message, {
        extensions: [spoilerSyntax()],
        htmlExtensions: [spoilerHtml()],
    })
    const emojiCodeRegex = /:(?!\s)([^:\s]+)(?<!\s):/g
    html = html.replace(emojiCodeRegex, (match, inner) =>  {
        const emoji = currentRoomCustomEmojiByCode[match]
        if (emoji?.image?.url) {
            return `<img data-mx-emoticon src="${emoji.image.url}" alt="${match}" title="${match}" height="32" vertical-align="middle">`
        } else {
            return match
        }
    });
    const messageContainsSpoilers = message.includes('||')
    html = linkifyHtml(html, { ignoreTags: ['script', 'style'] })
    return {
        body: messageContainsSpoilers ? replaceSpoilers(message, t('room.spoilerRedacted')) : message,
        unredactedBody: messageContainsSpoilers ? message : undefined,
        formattedBody: html,
    }
}
