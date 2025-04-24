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
        const chunksService = getService('chunks')
        const tagHandling = format === 'plain' ? undefined : 'html'

        let textArray = Array.isArray(text) ? text : [text]
        if (format === 'jsonb') {
          textArray = await formatService.blockToHtml(textArray)
        } else if (format === 'markdown') {
          textArray = formatService.markdownToHtml(textArray)
        }

        const { chunks, reduceFunction } = chunksService.split(textArray, {
          maxLength: AI_API_MAX_TEXTS,
          maxByteSize: AI_API_ROUGH_MAX_REQUEST_SIZE,
        })

        // Add check for single long chunk and split by newline if necessary
        if (chunks.length === 1) {
          const singleChunk = chunks[0]
          // Calculate total characters in the strings within the chunk
          const totalLength = singleChunk.reduce((acc, str) => acc + str.length, 0)

          if (totalLength > 300) {
            // Split strings within the chunk by newline and flatten the result
            const newSplitChunk = singleChunk.flatMap((text) => text.split('\n'))
            // Replace the original chunk with the newly split one, removing empty strings
            chunks[0] = newSplitChunk.filter((text) => text.length > 0)
            console.log('🚀 ~ chunks after split:', chunks.length)
          }
        }

        console.log('🚀 ~ chunks:', chunks.length)
        const translationPromises = chunks.map(async (chunkTexts) => {
          try {
            const result = await client.translate({
              texts: chunkTexts,
              sourceLocale: sourceLocale,
              targetLocale: targetLocale,
              ...apiOptions,
              tagHandling,
            })
            console.log('🚀 ~ chunks.map ~ result:', JSON.stringify(result, null, 2))
            return result
          } catch (error) {
            console.error('🚀 ~ chunks.map ~ error translating chunk:', error)
            return chunkTexts.map(() => '')
          }
        })

        const combinedResults = (await Promise.all(translationPromises)).join('\n')

        if (format === 'jsonb') {
          return formatService.htmlToBlock(combinedResults)
        }
        if (format === 'markdown') {
          return formatService.htmlToMarkdown(combinedResults)
        }
        return combinedResults
      },
      async usage() {
        return 1
      },
    }
  },
}
