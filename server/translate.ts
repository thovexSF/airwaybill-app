import { GoogleGenerativeAI } from '@google/generative-ai'

// Same provider and key as the b2b backend (GEMINI_API_KEY); created on first
// use so the server still boots where no key is configured.
let gemini: GoogleGenerativeAI | null = null

const LANG_NAME = { en: 'English', es: 'Spanish' } as const
export type TranslateTarget = keyof typeof LANG_NAME

const instructions = (target: TranslateTarget) =>
  `You translate the text fields of an air cargo proforma invoice into ${LANG_NAME[target]}. ` +
  'You receive a JSON object of field keys to texts; reply with a JSON object with exactly the same keys. ' +
  'Keep company and person names, addresses, codes (Incoterms, AWB and flight numbers, HS codes), numbers, ' +
  'units and measurements exactly as written. Keep line breaks and letter case (an all-caps field stays all caps). ' +
  'A field already in the target language, or with nothing to translate, comes back unchanged.'

/** Translates free-text fields; returns only keys it was given. */
export async function translateFields(fields: Record<string, string>, target: TranslateTarget): Promise<Record<string, string>> {
  const input = Object.fromEntries(Object.entries(fields).filter(([, v]) => v.trim()))
  if (!Object.keys(input).length) return {}

  gemini ??= new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = gemini.getGenerativeModel({
    model: process.env.TRANSLATE_MODEL || 'gemini-2.5-flash-lite',
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  })
  const result = await model.generateContent([{ text: instructions(target) }, { text: JSON.stringify(input) }])
  const parsed = JSON.parse(result.response.text()) as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(parsed).filter(([k, v]) => k in input && typeof v === 'string') as [string, string][],
  )
}
