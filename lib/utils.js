const translatePrompt = ({ texts, sourceLocale, targetLocale }) => {
  const languageNames = new Intl.DisplayNames(["en"], { type: "language" })
  const sourceLang = languageNames.of(sourceLocale)
  const targetLang = languageNames.of(targetLocale)

  // Constructing the new prompt based on user input
  const newPrompt = `You are a professional translator specializing in simplifying complex text. Your task is to translate the string values within the following JSON object from ${sourceLang} to ${targetLang}, following a specific three-step strategy.

Rules:
1.  Translate accurately, conveying the original meaning.
2.  **Maintain the original JSON structure.** Do not translate keys, only string values.
3.  Preserve proper nouns, brand names, technical terms (like FLAC, JPEG, Microsoft, OpenAI), and citation markers (like [20]).
4.  Keep original formatting within strings (e.g., Markdown, HTML, etc.).

Strategy:
Perform the translation in three steps for the content of the JSON values:
1.  **Direct Translation:** Provide a literal translation of the ${sourceLang} text to ${targetLang}, preserving original format.
2.  **Identify Issues:** List specific issues with the direct translation (e.g., awkward phrasing, unnatural language, difficult concepts) without suggesting fixes yet.
3.  **Idiomatic Translation:** Re-translate based on steps 1 and 2, making it natural, easy to understand for a general audience in ${targetLang}, while staying true to the original meaning and format.

Input JSON:
${texts}

Output Format:
For the final response, provide ONLY the resulting JSON object where the original string values have been replaced by their final idiomatic translations (${targetLang}) from step 3. 
Do not include the intermediate steps (Direct Translation, Identify Issues) or any extra text in the final output.

Example Output:
{
  "translation": [
    "Hello, world!"
  ]
}

`
  return newPrompt
}

module.exports = {
  translatePrompt,
}
