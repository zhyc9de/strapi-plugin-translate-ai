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
        let didManualNewlineSplit = false // Flag to track manual splitting

        // --- Start: Manual Newline Split Logic (moved before format conversion) ---
        const potentialSingleChunk = textArray.length <= AI_API_MAX_TEXTS
        const totalLength = textArray.reduce((acc, str) => acc + str.length, 0)

        if (potentialSingleChunk && totalLength > 3000) {
          console.log(
            '🚀 ~ Input textArray seems like a single long chunk, splitting by newline first.',
          )
          textArray = textArray.flatMap((t) => t.split('\n')).filter((t) => t.length > 0)
          didManualNewlineSplit = true // Set the flag
        }
        // --- End: Manual Newline Split Logic ---

        if (format === 'jsonb') {
          textArray = await formatService.blockToHtml(textArray)
        } else if (format === 'markdown') {
          textArray = formatService.markdownToHtml(textArray)
        }

        const { chunks, reduceFunction } = chunksService.split(textArray, {
          maxLength: AI_API_MAX_TEXTS,
          maxByteSize: AI_API_ROUGH_MAX_REQUEST_SIZE,
        })

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
            // console.log('🚀 ~ chunks.map ~ result:', JSON.stringify(result, null, 2))
            return result
          } catch (error) {
            console.error('🚀 ~ chunks.map ~ error translating chunk:', error)
            return chunkTexts.map(() => '')
          }
        })

        const combinedResults = reduceFunction(await Promise.all(translationPromises))

        let finalResult
        if (format === 'jsonb') {
          finalResult = await formatService.htmlToBlock(combinedResults)
        } else if (format === 'markdown') {
          console.log('🚀 ~ combinedResults before htmlToMarkdown:', combinedResults)
          finalResult = formatService.htmlToMarkdown(combinedResults)
          console.log('🚀 ~ finalResult after htmlToMarkdown:', finalResult)
        } else {
          finalResult = combinedResults
        }

        // --- Start: Final Join Logic ---
        if (didManualNewlineSplit) {
          console.log('🚀 ~ Rejoining manually split results with newline')
          finalResult = [finalResult.join('\\n')] // Wrap the joined string in an array
        }
        // --- End: Final Join Logic ---

        return finalResult
      },

      async usage() {
        return 1
      },
    }
  },
}
