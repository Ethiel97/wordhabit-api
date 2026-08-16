import { PartOfSpeech } from '../../../vocabulary/domain/entities/part-of-speech';
import { QuizMode, QuizQuestion, QuizQuestionKind } from '../entities/quiz';

/**
 * Everything the builder knows about the word under test.
 *
 * Plain values, not entities: the builder is pure, and the repository
 * projects into this shape.
 */
export interface QuizTargetWord {
  wordId: string;
  term: string;
  partOfSpeech: PartOfSpeech;
  definitions: string[];
  examples: string[];
  synonyms: string[];
  antonyms: string[];
}

/**
 * A word the wrong answers are drawn from — same language and
 * difficulty as the target, so a distractor is wrong without being
 * absurd.
 */
export interface QuizDistractorWord {
  term: string;
  partOfSpeech: PartOfSpeech;
  definitions: string[];
  synonyms: string[];
}

/** One stored Real-World scenario, as the corpus holds it. */
export interface QuizScenarioSource {
  situation: string;
  question: string;
  correct: string;
  distractors: string[];
}

export interface BuildQuizInput {
  word: QuizTargetWord;
  pool: QuizDistractorWord[];
  scenarios: QuizScenarioSource[];
  mode: QuizMode;
  /**
   * Randomness injected rather than reached for, so a test can pin the
   * shuffle and assert exact output.
   */
  random?: () => number;
}

/** Options per MASTERY question — the target plus three wrong. */
const MASTERY_OPTION_COUNT = 4;

/** SPEED is two-option quick-fire: one tap, half a second. */
const SPEED_OPTION_COUNT = 2;

/**
 * Below this the word cannot sustain a round, and the caller should
 * say so rather than serve a two-question "challenge".
 */
export const MIN_QUIZ_QUESTIONS = 3;

/**
 *
 * Builds a quiz round from corpus material alone.
 *
 * MASTERY and SPEED are assembled here by combination — definitions,
 * synonyms, antonyms and gap-filled examples against a pool of
 * same-difficulty words. REALWORLD only reshuffles what ingestion
 * wrote: its wrong answers are misuses of the term itself, which no
 * combination of other words' fields can produce.
 */
export function buildQuizQuestions(input: BuildQuizInput): QuizQuestion[] {
  const random = input.random ?? Math.random;

  switch (input.mode) {
    case QuizMode.REALWORLD:
      return buildRealWorld(input.scenarios, random);
    case QuizMode.MASTERY:
      return buildMastery(input.word, input.pool, random);
    case QuizMode.SPEED:
      return buildSpeed(input.word, input.pool, input.scenarios, random);
  }
}

function buildRealWorld(
  scenarios: QuizScenarioSource[],
  random: () => number,
): QuizQuestion[] {
  // Shuffled so two rounds the same day at least change their order.
  return shuffle(scenarios, random).map((scenario) =>
    toQuestion({
      kind: QuizQuestionKind.USAGE,
      situation: scenario.situation,
      prompt: scenario.question,
      correct: scenario.correct,
      distractors: scenario.distractors,
      random,
    }),
  );
}

function buildMastery(
  word: QuizTargetWord,
  pool: QuizDistractorWord[],
  random: () => number,
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const wrongCount = MASTERY_OPTION_COUNT - 1;

  // Correct answers are sampled, not taken first-of-list: a learner
  // retaking the quiz the same day should meet a different definition,
  // sentence and synonym, or the round feels like a replay.
  const poolDefinitions = distinct(pool.flatMap((w) => w.definitions));
  const [primarySense] = sample(word.definitions, 1, random);
  if (primarySense && poolDefinitions.length >= wrongCount) {
    questions.push(
      toQuestion({
        kind: QuizQuestionKind.MEANING,
        prompt: `What does “${word.term}” mean?`,
        correct: primarySense,
        distractors: sample(poolDefinitions, wrongCount, random),
        random,
      }),
    );
  }

  const [gap] = sample(gapFills(word), 1, random);
  const poolTerms = distinct(pool.map((w) => w.term));
  if (gap && poolTerms.length >= wrongCount) {
    questions.push(
      toQuestion({
        kind: QuizQuestionKind.GAP_FILL,
        prompt: gap,
        correct: word.term,
        distractors: sample(poolTerms, wrongCount, random),
        random,
      }),
    );
  }

  // Wrong answers are other words' synonyms — near in register, far in
  // sense — rather than bare terms, which would give the game away by
  // sticking out stylistically.
  const poolSynonyms = distinct(
    pool.flatMap((w) => w.synonyms),
    word.synonyms,
  );
  if (word.synonyms.length > 0 && poolSynonyms.length >= wrongCount) {
    questions.push(
      toQuestion({
        kind: QuizQuestionKind.SYNONYM,
        prompt: `Closest in meaning to “${word.term}”?`,
        correct: sample(word.synonyms, 1, random)[0],
        distractors: sample(poolSynonyms, wrongCount, random),
        random,
      }),
    );
  }

  // A second meaning question from a different sense, when the word has
  // one — the round should not shrink just because a word lacks
  // synonyms.
  const otherSenses = word.definitions.filter((def) => def !== primarySense);
  if (
    questions.length < MIN_QUIZ_QUESTIONS &&
    otherSenses.length > 0 &&
    poolDefinitions.length >= wrongCount
  ) {
    questions.push(
      toQuestion({
        kind: QuizQuestionKind.MEANING,
        prompt: `Which is another sense of “${word.term}”?`,
        correct: sample(otherSenses, 1, random)[0],
        distractors: sample(poolDefinitions, wrongCount, random),
        random,
      }),
    );
  }

  return questions;
}

function buildSpeed(
  word: QuizTargetWord,
  pool: QuizDistractorWord[],
  scenarios: QuizScenarioSource[],
  random: () => number,
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const wrongCount = SPEED_OPTION_COUNT - 1;

  const poolDefinitions = distinct(pool.flatMap((w) => w.definitions));
  const [sense] = sample(word.definitions, 1, random);
  if (sense && poolDefinitions.length >= wrongCount) {
    questions.push(
      toQuestion({
        kind: QuizQuestionKind.MEANING,
        prompt: `“${word.term}” means…`,
        correct: firstClause(sense),
        distractors: sample(poolDefinitions, wrongCount, random).map(
          firstClause,
        ),
        random,
      }),
    );
  }

  const poolSynonyms = distinct(
    pool.flatMap((w) => w.synonyms),
    word.synonyms,
  );
  if (word.synonyms.length > 0 && poolSynonyms.length >= wrongCount) {
    questions.push(
      toQuestion({
        kind: QuizQuestionKind.SYNONYM,
        prompt: `Closest to “${word.term}”…`,
        correct: sample(word.synonyms, 1, random)[0],
        distractors: sample(poolSynonyms, wrongCount, random),
        random,
      }),
    );
  }

  // The wrong answer to "opposite of X" is one of X's own synonyms:
  // same register, exactly inverted sense — the fairest hard question
  // two corpus fields can make.
  if (word.antonyms.length > 0 && word.synonyms.length > 0) {
    questions.push(
      toQuestion({
        kind: QuizQuestionKind.ANTONYM,
        prompt: `Opposite of “${word.term}”…`,
        correct: sample(word.antonyms, 1, random)[0],
        distractors: sample(word.synonyms, 1, random),
        random,
      }),
    );
  }

  // Options are PartOfSpeech codes, not prose: the client localizes
  // them, which no stored string in either corpus language could.
  const otherPartsOfSpeech = Object.values(PartOfSpeech).filter(
    (pos) => pos !== word.partOfSpeech && pos !== PartOfSpeech.OTHER,
  );
  questions.push(
    toQuestion({
      kind: QuizQuestionKind.WORD_TYPE,
      prompt: `“${word.term}” is a…`,
      correct: word.partOfSpeech,
      distractors: sample(otherPartsOfSpeech, 1, random),
      random,
    }),
  );

  // A stored scenario, cut down to two options: quick-fire usage.
  if (scenarios.length > 0) {
    const scenario = sample(scenarios, 1, random)[0];
    questions.push(
      toQuestion({
        kind: QuizQuestionKind.USAGE,
        prompt: 'Which sounds right?',
        correct: scenario.correct,
        distractors: sample(scenario.distractors, wrongCount, random),
        random,
      }),
    );
  }

  return questions;
}

function toQuestion(params: {
  kind: QuizQuestionKind;
  prompt: string;
  correct: string;
  distractors: string[];
  situation?: string;
  random: () => number;
}): QuizQuestion {
  const options = shuffle(
    [params.correct, ...params.distractors],
    params.random,
  );
  return {
    kind: params.kind,
    ...(params.situation ? { situation: params.situation } : {}),
    prompt: params.prompt,
    options,
    correctIndex: options.indexOf(params.correct),
  };
}

/** Every example with its term blanked — one is sampled per round. */
function gapFills(word: QuizTargetWord): string[] {
  const pattern = new RegExp(escapeRegExp(word.term), 'i');
  return word.examples
    .filter((sentence) => pattern.test(sentence))
    .map((sentence) => sentence.replace(pattern, '_____'));
}

/**
 * The definition up to its first comma or dash — SPEED options must be
 * readable in a half-second glance, and full definitions are not.
 */
function firstClause(definition: string): string {
  const cut = definition.split(/[,—;]/)[0].trim();
  return cut.length > 0 ? cut : definition;
}

function distinct(values: string[], exclude: string[] = []): string[] {
  const excluded = new Set(exclude.map((value) => value.toLowerCase()));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (excluded.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function sample<T>(values: T[], count: number, random: () => number): T[] {
  return shuffle(values, random).slice(0, count);
}

/** Fisher–Yates on a copy; the input is never mutated. */
function shuffle<T>(values: T[], random: () => number): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
