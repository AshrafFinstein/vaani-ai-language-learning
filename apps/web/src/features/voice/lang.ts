// Maps our language codes to BCP-47 tags the Web Speech API expects.
const LANG_BCP47: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  hi: 'hi-IN',
  ta: 'ta-IN',
};

export function toBcp47(code: string | null | undefined): string {
  if (!code) return 'en-US';
  return LANG_BCP47[code] ?? code;
}
