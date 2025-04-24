const { translatePrompt } = require('./utils')

class AiTranslator {
  constructor(options) {
    const { apiKey, apiUrl, apiModel, maxTokens, generalPromt } = options
    if (!apiKey) throw new Error(`apiKey is not defined`)

    this.apiKey = apiKey || ''
    this.apiUrl = apiUrl || 'https://api.openai.com/v1/chat/completions'
    this.apiModel = apiModel || 'gpt-4.1'
    this.generalPromt = generalPromt
  }

  async translate(options) {
    const { texts, sourceLocale, targetLocale } = options
    let data
    try {
      const textsStr = JSON.stringify({ translation: texts })
      const prmopt = translatePrompt({ texts: textsStr, sourceLocale, targetLocale })

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.apiModel,
          stream: false,
          temperature: 0.2,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          response_format: {
            type: 'json_object',
          },
          messages: [
            {
              role: 'user',
              content: prmopt,
            },
          ],
        }),
      })

      if (response.status === 200) {
        data = await response.json()
        try {
          const rawContent = data?.choices[0]?.message?.content || ''
          let content = rawContent.trim()
          content = content
            .replace(/^```[^\n]*\n?/, '')
            .replace(/\n?```$/, '')
            .trim()
          const json = JSON.parse(content)

          if (json?.translation?.length) {
            return json?.translation
          }
          throw new Error('No result received')
        } catch (error) {
          throw new Error(error)
        }
      } else {
        const { status, statusText } = response
        throw new Error(JSON.stringify({ status, statusText }))
      }
    } catch (error) {
      console.log('🚀 ~ translate ~ error:', error, JSON.stringify(data, null, 2))
      const status = error?.response?.status
      switch (status) {
        case 429:
          throw new Error('Too many requests')
        case 400:
          throw new Error('Bad request')
        default:
          throw new Error(`translate(): ${JSON.stringify(error)}`)
      }
    }
  }
}

module.exports = { AiTranslator }
