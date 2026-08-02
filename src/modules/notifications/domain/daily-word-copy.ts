/**
 * The notification's wording, composed here because a killed app cannot
 * be asked what language it speaks.
 *
 * The term itself carries the message. "Your word is ready" asks for
 * trust; *liminal* creates a gap — the reader knows the word exists and
 * not what it means, and only the app closes that. The meaning is
 * deliberately withheld.
 *
 * Kept out of the i18n stack on purpose: two strings in three languages
 * do not justify wiring a translation runtime into a worker.
 */
const COPY: Record<string, (term: string) => { title: string; body: string }> =
  {
    EN: (term) => ({
      title: `✨ Today's word: ${term}`,
      body: 'Tap to discover what it means and keep your streak growing 🔥',
    }),
    FR: (term) => ({
      title: `✨ Votre mot du jour : ${term}`,
      body: 'Touchez pour découvrir son sens et faire grandir votre série 🔥',
    }),
    ES: (term) => ({
      title: `✨ Tu palabra del día: ${term}`,
      body: 'Toca para descubrir su significado y mantener tu racha 🔥',
    }),
  };

export function dailyWordCopy(
  interfaceLanguage: string,
  term: string,
): { title: string; body: string } {
  return (COPY[interfaceLanguage] ?? COPY.EN)(
    term.charAt(0).toUpperCase() + term.slice(1),
  );
}
