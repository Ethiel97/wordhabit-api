/**
 * The notification's wording, composed here because a killed app cannot
 * be asked what language it speaks.
 *
 * The term carries the message and the meaning is withheld: "Your word
 * is ready" asks for trust, *liminal* creates a gap only the app closes.
 * Naming the topic the word came from says it was picked for them.
 *
 * Out of the i18n stack: a few strings do not justify a translation
 * runtime in a worker.
 */
type Copy = { title: string; body: string };

const COPY: Record<string, (term: string, topic?: string) => Copy> = {
  EN: (term, topic) => ({
    title: `✨ Today's word: ${term}`,
    body: topic
      ? `Picked from your ${topic} topic. Tap to discover what it means 🔥`
      : 'Tap to discover what it means and keep your streak growing 🔥',
  }),
  FR: (term, topic) => ({
    title: `✨ Votre mot du jour : ${term}`,
    body: topic
      ? `Choisi dans votre thème ${topic}. Touchez pour découvrir son sens 🔥`
      : 'Touchez pour découvrir son sens et faire grandir votre série 🔥',
  }),
  ES: (term, topic) => ({
    title: `✨ Tu palabra del día: ${term}`,
    body: topic
      ? `Elegida de tu tema ${topic}. Toca para descubrir su significado 🔥`
      : 'Toca para descubrir su significado y mantener tu racha 🔥',
  }),
  DE: (term, topic) => ({
    title: `✨ Dein Wort des Tages: ${term}`,
    body: topic
      ? `Ausgewählt aus deinem Thema ${topic}. Tippe, um seine Bedeutung zu entdecken 🔥`
      : 'Tippe, um seine Bedeutung zu entdecken und deine Serie fortzusetzen 🔥',
  }),
};

/** The chip labels the app shows, so the push and the screen agree. */
const THEME_LABELS: Record<string, Record<string, string>> = {
  'advanced-rare-vocabulary': {
    EN: 'Rare words',
    FR: 'Mots rares',
    ES: 'Palabras raras',
    DE: 'Seltene Wörter',
  },
  'art-creativity': { EN: 'Art', FR: 'Art', ES: 'Arte', DE: 'Kunst' },
  'business-entrepreneurship': {
    EN: 'Business',
    FR: 'Business',
    ES: 'Negocios',
    DE: 'Business',
  },
  'cinema-storytelling': { EN: 'Cinema', FR: 'Cinéma', ES: 'Cine', DE: 'Kino' },
  'finance-investing': {
    EN: 'Finance',
    FR: 'Finance',
    ES: 'Finanzas',
    DE: 'Finanzen',
  },
  'health-wellness': {
    EN: 'Wellness',
    FR: 'Bien-être',
    ES: 'Bienestar',
    DE: 'Wohlbefinden',
  },
  'history-civilizations': {
    EN: 'History',
    FR: 'Histoire',
    ES: 'Historia',
    DE: 'Geschichte',
  },
  'luxury-lifestyle': {
    EN: 'Lifestyle',
    FR: 'Art de vivre',
    ES: 'Estilo de vida',
    DE: 'Lebensart',
  },
  'music-performance': {
    EN: 'Music',
    FR: 'Musique',
    ES: 'Música',
    DE: 'Musik',
  },
  'nature-environment': {
    EN: 'Nature',
    FR: 'Nature',
    ES: 'Naturaleza',
    DE: 'Natur',
  },
  'philosophy-critical-thinking': {
    EN: 'Philosophy',
    FR: 'Philosophie',
    ES: 'Filosofía',
    DE: 'Philosophie',
  },
  'politics-geopolitics': {
    EN: 'Politics',
    FR: 'Politique',
    ES: 'Política',
    DE: 'Politik',
  },
  'psychology-human-behavior': {
    EN: 'Psychology',
    FR: 'Psychologie',
    ES: 'Psicología',
    DE: 'Psychologie',
  },
  'relationships-communication': {
    EN: 'Relationships',
    FR: 'Relations',
    ES: 'Relaciones',
    DE: 'Beziehungen',
  },
  'science-space': {
    EN: 'Science',
    FR: 'Sciences',
    ES: 'Ciencia',
    DE: 'Wissenschaft',
  },
  'self-improvement-productivity': {
    EN: 'Self-improvement',
    FR: 'Développement perso',
    ES: 'Desarrollo personal',
    DE: 'Persönliche Entwicklung',
  },
  'social-media-internet-culture': {
    EN: 'Social media',
    FR: 'Réseaux sociaux',
    ES: 'Redes sociales',
    DE: 'Soziale Medien',
  },
  'sports-competition': {
    EN: 'Sport',
    FR: 'Sport',
    ES: 'Deporte',
    DE: 'Sport',
  },
  'technology-ai': {
    EN: 'Tech & AI',
    FR: 'Tech et IA',
    ES: 'Tecnología',
    DE: 'Tech & KI',
  },
  'travel-cultures': {
    EN: 'Travel',
    FR: 'Voyages',
    ES: 'Viajes',
    DE: 'Reisen',
  },
};

/** The word's first theme the learner also chose, if any. */
export function sharedTopic(
  wordThemes: readonly string[] | undefined,
  profileThemes: readonly string[],
): string | undefined {
  return wordThemes?.find((slug) => profileThemes.includes(slug));
}

export function dailyWordCopy(
  interfaceLanguage: string,
  term: string,
  topicSlug?: string,
): Copy {
  const language = interfaceLanguage in COPY ? interfaceLanguage : COPY.EN.name;
  const topic = topicSlug ? THEME_LABELS[topicSlug]?.[language] : undefined;
  return COPY[language](term.charAt(0).toUpperCase() + term.slice(1), topic);
}
