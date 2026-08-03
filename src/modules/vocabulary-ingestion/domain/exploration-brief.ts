import { LanguageCode } from '../../vocabulary/domain/entities/language-code';

/**
 * Words per language beyond which generation stops.
 *
 * The corpus is built once and served forever: a word costs one
 * generation and is then shown to every user, every day, for years.
 * That makes it an investment with an end, not a subscription — but the
 * nightly job as written would keep paying for ever, long past the point
 * where anyone could reach the words it adds.
 *
 * Fourteen themes across three difficulties is forty-two buckets; a
 * thousand words fills each with enough variety that two users rarely
 * meet the same word on the same day, and a daily learner would need
 * three years to see them all.
 */
export const CORPUS_TARGET_PER_LANGUAGE = 1600;

/**
 * The corner of the lexicon one batch is sent to explore.
 *
 * Without it, every batch asks the same open question — "give me
 * sophisticated, nuanced vocabulary" — and a model answers it from the
 * same few hundred high-probability words every time. The exclusion list
 * stops those words being *stored* twice; the brief stops them being
 * *asked for* twice.
 *
 * It also carries the difficulty mix and the expression quota: a prompt
 * that only praises sophistication produces almost no beginner words and
 * almost no idioms, which are exactly what the daily word needs.
 */
export interface ExplorationBrief {
  semanticField: string;
  beginner: number;
  intermediate: number;
  advanced: number;
  minExpressions: number;
}

/**
 * Fields of human experience, not dictionary categories.
 *
 * Themes already slice the corpus by subject; this slices it by the
 * *situation* a word belongs to, which is what makes an example sentence
 * sound like something a person said.
 */
const SEMANTIC_FIELDS = [
  'how people describe other people — character, presence, the impression someone leaves',
  'conflict and disagreement — arguing, conceding, holding a line, saving face',
  'work and ambition — competence, politics, burnout, recognition',
  'attention and thought — noticing, understanding, being wrong, changing your mind',
  'time and change — waiting, momentum, decline, things ending well or badly',
  'intimacy and distance — closeness, withdrawal, loyalty, what goes unsaid',
  'speech itself — how things are phrased, hedged, insinuated, or refused',
  'the physical world as people talk about it — light, weather, texture, movement',
  'money, status and taste — what is spent, signalled, envied, or quietly judged',
  'failure and repair — mistakes, apology, recovery, second attempts',
  'humour and irony — teasing, deadpan, self-deprecation, wit that lands',
  'belief and doubt — conviction, superstition, scepticism, changing loyalties',
  'desire and aversion — wanting, craving, resisting, being repelled',
  'safety and risk — danger, caution, recklessness, the thrill of uncertainty',
  'morality and ethics — fairness, justice, hypocrisy, moral compromise',
  'pleasure and pain — enjoyment, discomfort, endurance, relief',
  'memory and forgetting — nostalgia, amnesia, recollection, selective memory',
  'health and illness — fatigue, pain, recovery, and what people say when they would rather not talk about it',
  'society and culture — fitting in, standing out, unwritten rules and the cost of breaking them',
  'nature and the environment — how people notice, describe and worry about what is around them',
  'sports and games — competition, strategy, skill, and the social dynamics of play',
  'technology and innovation — how people adapt, resist, and are affected by new tools',
  'travel and exploration — the experience of moving through different places and cultures',
  'food and drink — taste, preparation, sharing, and the social aspects of eating',
  'art and creativity — expression, interpretation, and the impact of creative work',
  'law and order — rules, enforcement, justice, and the consequences of breaking norms',
  'family and relationships — dynamics, roles, communication, and conflict resolution',
  'emotions and feelings — how people express, manage, and understand their own and others’ emotions',
  'education and learning — acquiring knowledge, teaching, and the challenges of understanding',
  'history and memory — how past events are remembered, interpreted, and influence the present',
  'science and discovery — curiosity, experimentation, and the process of learning about the world',
  'religion and spirituality — beliefs, practices, and the role of faith in society',
];

/**
 * Builds the brief for one batch.
 *
 * Derived from the date and the language rather than stored: nothing to
 * migrate, and the same day always produces the same brief — so a failed
 * job that retries explores the same corner instead of drifting. The
 * language shifts the index so the three nightly batches do not all land
 * on the same field.
 */
export function buildExplorationBrief(params: {
  targetLanguage: LanguageCode;
  count: number;
  on: Date;
}): ExplorationBrief {
  const { targetLanguage, count, on } = params;

  const day = Math.floor(on.getTime() / (24 * 60 * 60 * 1000));
  const offset = Math.max(0, ['EN', 'FR', 'ES'].indexOf(targetLanguage)) * 5;

  // Roughly a third each, remainder to intermediate. An even split
  // rather than a pyramid: the daily word is drawn per profile
  // difficulty, so a corpus skewed to advanced starves beginners — the
  // reason `findCandidateWord` needed a fallback in the first place.
  const third = Math.floor(count / 3);

  return {
    semanticField: SEMANTIC_FIELDS[(day + offset) % SEMANTIC_FIELDS.length],
    beginner: third,
    advanced: third,
    intermediate: count - 2 * third,
    // A fifth, floor 2: idioms are the part a learner cannot assemble
    // from a dictionary, and the part an unguided model never offers.
    minExpressions: Math.max(2, Math.round(count * 0.2)),
  };
}
