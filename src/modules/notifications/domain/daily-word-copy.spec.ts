import { dailyWordCopy, sharedTopic } from './daily-word-copy';

describe('dailyWordCopy', () => {
  it('keeps the plain body when no topic is shared', () => {
    expect(dailyWordCopy('FR', 'sérendipité').body).toBe(
      'Touchez pour découvrir son sens et faire grandir votre série 🔥',
    );
  });

  it('names the topic in the reader language', () => {
    expect(
      dailyWordCopy('FR', 'sérendipité', 'history-civilizations').body,
    ).toBe(
      'Choisi dans votre thème Histoire. Touchez pour découvrir son sens 🔥',
    );
    expect(dailyWordCopy('ES', 'serendipia', 'science-space').body).toContain(
      'Ciencia',
    );
  });

  it('falls back to the plain body for a slug it cannot label', () => {
    expect(dailyWordCopy('EN', 'serendipity', 'brand-new-theme').body).toBe(
      'Tap to discover what it means and keep your streak growing 🔥',
    );
  });
});

describe('sharedTopic', () => {
  it('prefers the first word theme the profile also holds', () => {
    expect(
      sharedTopic(
        ['art-creativity', 'history-civilizations'],
        ['history-civilizations'],
      ),
    ).toBe('history-civilizations');
    expect(sharedTopic(['art-creativity'], ['science-space'])).toBeUndefined();
    expect(sharedTopic(undefined, ['science-space'])).toBeUndefined();
  });
});
