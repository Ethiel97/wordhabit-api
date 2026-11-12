import { getStreakRiskCopy } from './streak-risk-copy';

describe('getStreakRiskCopy', () => {
  it('talks about yesterday on the second day, when there is no streak to lose', () => {
    expect(getStreakRiskCopy(1, 'EN').body).toBe(
      'You started yesterday. Today’s word is waiting.',
    );
    expect(getStreakRiskCopy(1, 'FR').body).toBe(
      'Vous avez commencé hier. Votre mot du jour vous attend.',
    );
    expect(getStreakRiskCopy(1, 'ES').body).toBe(
      'Empezaste ayer. Tu palabra del día te espera.',
    );
  });

  it('names the streak from two days on', () => {
    expect(getStreakRiskCopy(2, 'EN').body).toContain('2-day streak');
    expect(getStreakRiskCopy(5, 'FR').body).toContain('série de 5 jours');
    expect(getStreakRiskCopy(12, 'ES').body).toContain('racha de 12 días');
  });

  it('falls back to English for a language without copy', () => {
    expect(getStreakRiskCopy(3, 'DE')).toEqual(getStreakRiskCopy(3, 'EN'));
  });
});
