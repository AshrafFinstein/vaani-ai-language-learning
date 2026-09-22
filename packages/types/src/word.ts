/**
 * Seed vocabulary decks for Word Mode (MVP). Keyed by language code so new languages
 * can be added without code changes. Full user-specific SRS persistence lands in the
 * Vocabulary phase; Word Mode tracks review state client-side for now.
 */

export interface WordCard {
  id: string;
  word: string;
  meaning: string;
  example: string;
  pronunciation?: string;
  synonyms?: string[];
  translation?: string;
}

const EN: WordCard[] = [
  {
    id: 'en-efficient',
    word: 'efficient',
    meaning: 'working well without wasting time or energy',
    example: 'She is very efficient at her job.',
    pronunciation: 'ih-FISH-uhnt',
    synonyms: ['productive', 'effective'],
  },
  {
    id: 'en-reliable',
    word: 'reliable',
    meaning: 'able to be trusted; consistent',
    example: 'He is a reliable friend who always shows up.',
    pronunciation: 'rih-LY-uh-buhl',
    synonyms: ['dependable', 'trustworthy'],
  },
  {
    id: 'en-curious',
    word: 'curious',
    meaning: 'eager to know or learn something',
    example: 'The children were curious about the new machine.',
    pronunciation: 'KYOOR-ee-uhs',
    synonyms: ['inquisitive', 'interested'],
  },
  {
    id: 'en-generous',
    word: 'generous',
    meaning: 'willing to give more than is expected',
    example: 'It was generous of her to share her lunch.',
    pronunciation: 'JEN-er-uhs',
    synonyms: ['giving', 'kind'],
  },
  {
    id: 'en-improve',
    word: 'improve',
    meaning: 'to make or become better',
    example: 'Practicing every day will improve your speaking.',
    pronunciation: 'im-PROOV',
    synonyms: ['enhance', 'get better'],
  },
];

const ES: WordCard[] = [
  {
    id: 'es-eficiente',
    word: 'eficiente',
    meaning: 'que funciona bien sin desperdiciar tiempo',
    example: 'Ella es muy eficiente en su trabajo.',
    translation: 'efficient',
    synonyms: ['productivo', 'eficaz'],
  },
  {
    id: 'es-amable',
    word: 'amable',
    meaning: 'que trata a los demás con cariño y respeto',
    example: 'El camarero fue muy amable con nosotros.',
    translation: 'kind',
    synonyms: ['gentil', 'cortés'],
  },
  {
    id: 'es-mejorar',
    word: 'mejorar',
    meaning: 'hacer que algo sea mejor',
    example: 'Quiero mejorar mi pronunciación.',
    translation: 'to improve',
    synonyms: ['perfeccionar', 'avanzar'],
  },
  {
    id: 'es-viaje',
    word: 'viaje',
    meaning: 'acción de ir de un lugar a otro',
    example: 'El viaje a la montaña fue muy bonito.',
    translation: 'trip / journey',
    synonyms: ['recorrido', 'excursión'],
  },
];

const DECKS: Record<string, WordCard[]> = { en: EN, es: ES };

/** Returns the deck for a language, falling back to English so every language works. */
export function getWordDeck(languageCode: string): WordCard[] {
  return DECKS[languageCode] ?? EN;
}
