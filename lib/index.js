'use strict'

const { AiTranslator } = require('./ai')

const {
  AI_PRIORITY_DEFAULT,
  AI_API_MAX_TEXTS,
  AI_API_ROUGH_MAX_REQUEST_SIZE,
} = require('./constants')
const { getService } = require('./get-service')

/**
 * Module dependencies
 */

module.exports = {
  provider: 'ai',
  name: 'AI',

  init(providerOptions = {}) {
    const apiKey = providerOptions.apiKey
    const apiUrl = providerOptions.apiUrl
    const apiModel = providerOptions.apiModel
    const apiOptions =
      typeof providerOptions.apiOptions === 'object' ? providerOptions.apiOptions : {}

    const client = new AiTranslator({ apiKey, apiUrl, apiModel })

    return {
      /**
       * @param {{
       *  text:string|string[],
       *  sourceLocale: string,
       *  targetLocale: string,
       *  priority: number,
       *  format?: 'plain'|'markdown'|'html'
       * }} options all translate options
       * @returns {string[]} the input text(s) translated
       */
      async translate({ text, priority, sourceLocale, targetLocale, format }) {
        if (!text) {
          return []
        }
        if (!sourceLocale || !targetLocale) {
          throw new Error('source and target locale must be defined')
        }

        const formatService = getService('format')
        const tagHandling = format === 'plain' ? undefined : 'html'

        let textArray = Array.isArray(text) ? text : [text]
        if (format === 'markdown') {
          textArray = formatService.markdownToHtml(textArray)
        }

        const translationPromises = textArray.map(async (singleText) => {
          let result
          try {
            result = await client.translate({
              texts: [singleText],
              sourceLocale: sourceLocale,
              targetLocale: targetLocale,
              ...apiOptions,
              tagHandling,
            })
            console.log('🚀 ~ textArray.map ~ result:', JSON.stringify(result, null, 2))
            return result.length > 0 ? result[0] : ''
          } catch (error) {
            console.log('🚀 ~ textArray.map ~ error:', error)
            return ''
          }
        })

        const result = await Promise.all(translationPromises)

        if (format === 'markdown') {
          return formatService.htmlToMarkdown(result)
        }

        return result
      },
      async usage() {
        return (await client.getUsage()).character
      },
    }
  },
}
