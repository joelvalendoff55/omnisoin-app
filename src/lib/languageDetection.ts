/**
 * Lightweight heuristic-based language detection for transcript text
 * No external API or LLM needed - purely client-side
 */

export type DetectedLanguage = 'fr' | 'en' | 'ar' | 'es' | 'pt' | 'wo' | 'unknown';

// Common words by language (high frequency, unique to that language)
const LANGUAGE_PATTERNS: Record<string, { words: string[]; accentPattern?: RegExp }> = {
  fr: {
    words: ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'est', 'que', 'qui', 'dans', 'pour', 'sur', 'avec', 'ce', 'cette', 'mais', 'pas', 'vous', 'nous', 'ils', 'elle', 'sont', 'ont', 'fait', 'être', 'avoir', 'plus', 'tout', 'aussi', 'même', 'comme', 'bien', 'très', 'peut', 'entre', 'après', 'sans', 'chez', 'quand', 'où', 'donc', 'parce', 'car', 'si', 'oui', 'non', 'merci', 'bonjour', 'monsieur', 'madame'],
    accentPattern: /[àâäéèêëïîôùûüç]/gi,
  },
  en: {
    words: ['the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'been', 'being', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall', 'with', 'this', 'that', 'these', 'those', 'from', 'they', 'their', 'there', 'here', 'where', 'when', 'what', 'which', 'who', 'whom', 'whose', 'how', 'why', 'because', 'although', 'however', 'therefore', 'hello', 'please', 'thank', 'thanks', 'sorry', 'yes', 'no'],
  },
  es: {
    words: ['el', 'los', 'las', 'una', 'unos', 'unas', 'del', 'al', 'es', 'son', 'está', 'están', 'fue', 'fueron', 'ser', 'estar', 'tener', 'hacer', 'que', 'qué', 'como', 'cómo', 'cuando', 'cuándo', 'donde', 'dónde', 'porque', 'por qué', 'pero', 'sino', 'aunque', 'también', 'muy', 'mucho', 'poco', 'más', 'menos', 'sí', 'no', 'hola', 'gracias', 'señor', 'señora'],
    accentPattern: /[áéíóúüñ]/gi,
  },
  pt: {
    words: ['o', 'os', 'as', 'um', 'uns', 'umas', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'pelo', 'pela', 'que', 'quem', 'como', 'quando', 'onde', 'porque', 'porquê', 'mas', 'também', 'muito', 'mais', 'menos', 'sim', 'não', 'olá', 'obrigado', 'obrigada', 'senhor', 'senhora', 'você', 'vocês', 'nós', 'eles', 'elas', 'está', 'estão', 'foi', 'foram', 'ser', 'estar', 'ter', 'fazer'],
    accentPattern: /[áàâãéêíóôõúüç]/gi,
  },
  ar: {
    // Arabic script detection
    words: [], // We'll detect Arabic by script rather than words
    accentPattern: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g,
  },
  wo: {
    // Wolof - common words
    words: ['am', 'ak', 'ci', 'bu', 'bi', 'ba', 'yi', 'gi', 'si', 'mi', 'li', 'ñu', 'mu', 'su', 'lu', 'nu', 'xam', 'def', 'dem', 'jëf', 'jàng', 'wax', 'bëgg', 'am na', 'jox', 'jël', 'tëj', 'ubbi', 'ñaan', 'ndax', 'waaw', 'déedéet', 'naka', 'fan', 'kañ', 'ndax', 'pour', 'njëkk'],
  },
};

// Minimum text length for reliable detection
const MIN_TEXT_LENGTH = 20;
const MIN_WORD_MATCHES = 3;

/**
 * Detects the language of a given text using heuristics
 */
export function detectLanguage(text: string | null | undefined): DetectedLanguage {
  if (!text || text.trim().length < MIN_TEXT_LENGTH) {
    return 'unknown';
  }

  const normalizedText = text.toLowerCase();
  const words = normalizedText.split(/\s+/);
  
  // Check for Arabic script first (most distinctive)
  const arabicPattern = LANGUAGE_PATTERNS.ar.accentPattern!;
  const arabicMatches = normalizedText.match(arabicPattern);
  if (arabicMatches && arabicMatches.length > 10) {
    return 'ar';
  }

  // Score each language
  const scores: Record<string, number> = {
    fr: 0,
    en: 0,
    es: 0,
    pt: 0,
    wo: 0,
  };

  // Count word matches for each language
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (lang === 'ar') continue; // Already handled
    
    for (const word of pattern.words) {
      // Use word boundary matching
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = normalizedText.match(regex);
      if (matches) {
        scores[lang] += matches.length;
      }
    }

    // Bonus for accent patterns
    if (pattern.accentPattern) {
      const accentMatches = normalizedText.match(pattern.accentPattern);
      if (accentMatches) {
        scores[lang] += accentMatches.length * 0.5;
      }
    }
  }

  // Normalize by total words to handle different text lengths
  const totalWords = words.length;
  for (const lang of Object.keys(scores)) {
    scores[lang] = scores[lang] / totalWords;
  }

  // Find the highest scoring language
  let maxLang: DetectedLanguage = 'unknown';
  let maxScore = 0;
  const minThreshold = MIN_WORD_MATCHES / totalWords;

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore && score >= minThreshold) {
      maxScore = score;
      maxLang = lang as DetectedLanguage;
    }
  }

  // If French and Portuguese are close, prefer French (more common in medical context)
  if (maxLang === 'pt' && scores.fr > scores.pt * 0.8) {
    maxLang = 'fr';
  }

  // If Spanish and Portuguese are close, check for distinctive markers
  if ((maxLang === 'es' || maxLang === 'pt') && Math.abs(scores.es - scores.pt) < 0.1) {
    // Portuguese has more nasal sounds and specific patterns
    if (/\bão\b|\bões\b|\bem\b|\bcom\b/i.test(normalizedText)) {
      maxLang = 'pt';
    } else {
      maxLang = 'es';
    }
  }

  return maxLang;
}

/**
 * Language display labels
 */
export const LANGUAGE_LABELS: Record<DetectedLanguage, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
  es: 'Español',
  pt: 'Português',
  wo: 'Wolof',
  unknown: 'Non détecté',
};

/**
 * All supported languages for manual selection
 */
export const SUPPORTED_LANGUAGES: DetectedLanguage[] = ['fr', 'en', 'ar', 'es', 'pt', 'wo', 'unknown'];
