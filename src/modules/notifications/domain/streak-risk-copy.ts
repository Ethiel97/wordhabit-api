type Copy = { title: string; body: string };

/** A one-day streak is the learner's first day: there is nothing to lose yet. */
const MIN_STREAK_AT_RISK = 2;

const COPY: Record<string, (streak: number, atRisk: boolean) => Copy> = {
  EN: (streak, atRisk) => ({
    title: `✨ Keep your streak going!`,
    body: atRisk
      ? `🔥 Your ${streak}-day streak ends at midnight. Tap to keep it alive.`
      : 'You started yesterday. Today’s word is waiting.',
  }),
  FR: (streak, atRisk) => ({
    title: `✨ Faites grandir votre série !`,
    body: atRisk
      ? `🔥 Votre série de ${streak} jours se termine à minuit. Touchez pour la maintenir en vie.`
      : 'Vous avez commencé hier. Votre mot du jour vous attend.',
  }),
  ES: (streak, atRisk) => ({
    title: `✨ ¡Mantén tu racha!`,
    body: atRisk
      ? `🔥 Tu racha de ${streak} días termina a medianoche. Toca para mantenerla viva.`
      : 'Empezaste ayer. Tu palabra del día te espera.',
  }),
};

export function getStreakRiskCopy(
  currentStreak: number,
  interfaceLanguage: string,
): Copy {
  const language = interfaceLanguage in COPY ? interfaceLanguage : COPY.EN.name;
  return COPY[language](currentStreak, currentStreak >= MIN_STREAK_AT_RISK);
}
