import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import OpenAI from 'openai';
import type {
  GeneratedVocabularyBatch,
  GenerateVocabularyBatchInput,
  VocabularyGenerationProvider,
  GenerateQuizMaterialInput,
  GeneratedQuizMaterialBatch,
  GenerateDefinitionsInput,
  GeneratedDefinitionsBatch,
} from '../../../domain/providers/vocabulary-generation.provider';
import {
  MAX_DEFINITION_BATCH_SIZE,
  MAX_QUIZ_MATERIAL_BATCH_SIZE,
  MAX_VOCABULARY_BATCH_SIZE,
} from '../../../domain/providers/vocabulary-generation.provider';
import {
  buildExplorationBrief,
  type ExplorationBrief,
} from '../../../domain/exploration-brief';
import { VocabularyGenerationQuotaExceededError } from '../../../domain/errors/vocabulary-generation-quota-exceeded.error';

const LANGUAGE_CODES = ['EN', 'FR', 'ES'] as const;

/**
 * Whether a provider error means the account is out of credit — the one
 * failure retrying cannot fix, which the queue must see as unrecoverable.
 *
 * Not every 429: a rate limit is also 429 and *should* back off and
 * retry. OpenAI marks a spent balance with `insufficient_quota`, except
 * the "no credits remaining" billing refusal observed in production,
 * which arrives as a bare 429 with only the message to go on.
 */
function isSpentQuota(error: InstanceType<typeof OpenAI.APIError>): boolean {
  if (error.code === 'insufficient_quota') return true;
  return (
    error.status === 429 &&
    /no credits|insufficient.credit|billing/i.test(error.message)
  );
}

/**
 * What a WordHabit definition sounds like, stated once.
 *
 * Shared by ingestion and by the definition backfill for the same
 * reason as the quiz rules: a word defined in French by one prompt and
 * in English by another would read as two products.
 */
const DEFINITION_RULES = [
  '# Definitions',
  'Write what a thoughtful friend would say, not what a dictionary prints.',
  'Name the nuance a near-synonym would miss.',
  'Never define a term using itself or its own root.',
];

/**
 * The rules of the Real-World mode, stated once.
 *
 * Both the nightly batch and the backfill prompt from this list: two
 * copies would drift, and a learner would meet two different games
 * under one name.
 */
const QUIZ_MATERIAL_RULES = [
  '# Antonyms',
  'Only a word a native speaker would accept as the opposite in the example sentence — not merely a word of contrary flavour.',
  'Leave the list empty rather than force one: plenty of terms have no true opposite, and a bad antonym makes a quiz question unanswerable.',
  '',
  '# Quiz scenarios',
  'Three to five per entry. Each sets an everyday moment — a message, a meeting, a mistake — in which someone might reach for the term.',
  '`situation` and `question` are written in the language of the definitions — the language the learner understands.',
  '`correct` and every distractor are utterances in the language of the term itself: producing the term in its own language is the skill under test.',
  '`language` names the language `situation` and `question` are written in.',
  '`correct` is what a native speaker would naturally say in that moment, using the term.',
  'Every distractor uses the term *incorrectly*, in a way a learner might plausibly produce: wrong part of speech, wrong register, or a sense the word does not carry.',
  'Three distractors where the misuse is clear, two where it is subtle.',
  'A distractor that simply omits the term teaches nothing — the mistake must be *in* how the term is used.',
  'Never repeat an example sentence in a scenario: a sentence the learner already read is a memory test, not a usage test.',
];

@Injectable()
export class OpenAiVocabularyGenerationProvider implements VocabularyGenerationProvider {
  private readonly logger = new Logger(OpenAiVocabularyGenerationProvider.name);

  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async generateVocabularyBatch(
    input: GenerateVocabularyBatchInput,
  ): Promise<GeneratedVocabularyBatch> {
    const explanationLanguage = input.explanationLanguage ?? 'EN';

    if (!input.allowedThemeSlugs?.length) {
      throw new InternalServerErrorException(
        'No allowed themes provided for vocabulary generation.',
      );
    }

    const count = Math.min(input.count, MAX_VOCABULARY_BATCH_SIZE);

    this.logger.debug({
      count,
      targetLanguage: input.targetLanguage,
      explanationLanguage,
      allowedThemeSlugs: input.allowedThemeSlugs,
    });

    const response = await this.createResponse({
      model: process.env.OPENAI_VOCABULARY_MODEL ?? 'gpt-5.2-pro',
      // No temperature: reasoning models reject the parameter outright
      // (400 Unsupported parameter). It is no loss — variety now comes
      // from the exclusion list and the exploration brief, which steer
      // *where* the model looks rather than adding noise to what it
      // says.
      // ~350 tokens per bilingual entry with two definitions, two
      // translated examples and phonetics. At 30 entries the old 12k
      // ceiling truncated the JSON, and a truncated response fails
      // JSON.parse — losing the whole batch, not the last few items.
      max_output_tokens: 24000,
      input: [
        {
          role: 'system',
          content: this.buildSystemPrompt(),
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: this.buildUserPrompt({
                count,
                targetLanguage: input.targetLanguage,
                explanationLanguage,
                allowedThemeSlugs: input.allowedThemeSlugs,
                excludedTerms: input.excludedTerms ?? [],
                underCoveredThemes: input.underCoveredThemes ?? [],
                // Falls back to a brief for today, so a caller that has
                // not been updated still gets a rotating territory
                // rather than the same open question every night.
                brief:
                  input.brief ??
                  buildExplorationBrief({
                    targetLanguage: input.targetLanguage,
                    count,
                    on: new Date(),
                  }),
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'generated_vocabulary_batch',
          strict: true,
          schema: this.buildSchema(input.allowedThemeSlugs),
        },
      },
    });

    // Worth a log line rather than a silent cost: on a reasoning model
    // the output budget also pays for the reasoning, so this is how you
    // find out whether `max_output_tokens` is being eaten before any
    // JSON is emitted.
    this.logger.log(
      `usage ${JSON.stringify(response.usage)} for ${count} ${input.targetLanguage} entries`,
    );

    const jsonText = response.output_text;

    if (!jsonText) {
      throw new InternalServerErrorException(
        'OpenAI returned an empty structured response.',
      );
    }

    const parsed = JSON.parse(jsonText) as GeneratedVocabularyBatch;

    return {
      items: parsed.items
        .map((item) => ({
          ...item,
          themeSlugs: item.themeSlugs.filter((slug) =>
            input.allowedThemeSlugs?.includes(slug),
          ),
        }))
        .filter((item) => item.themeSlugs.length > 0),
    };
  }

  async generateQuizMaterial(
    input: GenerateQuizMaterialInput,
  ): Promise<GeneratedQuizMaterialBatch> {
    const words = input.words.slice(0, MAX_QUIZ_MATERIAL_BATCH_SIZE);
    if (words.length === 0) return { items: [] };

    const response = await this.createResponse({
      model: process.env.OPENAI_VOCABULARY_MODEL ?? 'gpt-5.2-pro',
      // Scenarios are short but the reasoning budget is not: half the
      // batch ceiling, since each entry carries its context in.
      max_output_tokens: 16000,
      input: [
        {
          role: 'system',
          content: this.buildSystemPrompt(),
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                'These words are already in our corpus. Write quiz material for each — nothing else about them changes.',
                '',
                ...QUIZ_MATERIAL_RULES,
                '',
                '# Consistency',
                'Write scenarios against the senses defined below, not against other meanings the term may carry.',
                'Echo each `term` exactly as given.',
                '',
                '# Words',
                JSON.stringify(
                  words.map((word) => ({
                    term: word.term,
                    partOfSpeech: word.partOfSpeech,
                    definitions: word.definitions,
                    examples: word.examples.map((ex) => ex.sentence),
                  })),
                ),
              ].join('\n'),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'generated_quiz_material',
          strict: true,
          schema: this.buildQuizMaterialSchema(),
        },
      },
    });

    this.logger.log(
      `usage ${JSON.stringify(response.usage)} for quiz material on ${words.length} words`,
    );

    const jsonText = response.output_text;
    if (!jsonText) {
      throw new InternalServerErrorException(
        'OpenAI returned an empty structured response.',
      );
    }

    return JSON.parse(jsonText) as GeneratedQuizMaterialBatch;
  }

  async generateDefinitions(
    input: GenerateDefinitionsInput,
  ): Promise<GeneratedDefinitionsBatch> {
    const words = input.words.slice(0, MAX_DEFINITION_BATCH_SIZE);
    if (words.length === 0) return { items: [] };

    const { explanationLanguage } = input;

    const response = await this.createResponse({
      model: process.env.OPENAI_VOCABULARY_MODEL ?? 'gpt-5.2-pro',
      max_output_tokens: 12000,
      input: [
        { role: 'system', content: this.buildSystemPrompt() },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                `These words are already in our corpus. Write one definition each in ${explanationLanguage} — nothing else about them changes.`,
                '',
                ...DEFINITION_RULES,
                '',
                '# Consistency',
                'Define the sense the existing definitions and examples establish, not another meaning the term may carry.',
                // Not a translation: a Spanish reader needs the false
                // friend and the register that trip *them* up, which a
                // French gloss cannot know it is missing.
                `Write for a native ${explanationLanguage} speaker learning this word, in their idiom. Do not translate the existing definition.`,
                `\`explanationLanguage\` is ${explanationLanguage} for every definition you return.`,
                'Echo each `term` exactly as given.',
                '',
                '# Words',
                JSON.stringify(
                  words.map((word) => ({
                    term: word.term,
                    partOfSpeech: word.partOfSpeech,
                    definitions: word.definitions,
                    examples: word.examples.map((ex) => ex.sentence),
                  })),
                ),
              ].join('\n'),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'generated_definitions',
          strict: true,
          schema: this.buildDefinitionsSchema(),
        },
      },
    });

    this.logger.log(
      `usage ${JSON.stringify(response.usage)} for ${explanationLanguage} definitions on ${words.length} words`,
    );

    const jsonText = response.output_text;
    if (!jsonText) {
      throw new InternalServerErrorException(
        'OpenAI returned an empty structured response.',
      );
    }

    return JSON.parse(jsonText) as GeneratedDefinitionsBatch;
  }

  private buildDefinitionsSchema() {
    return {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['term', 'definitions'],
            properties: {
              term: { type: 'string' },
              definitions: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['explanationLanguage', 'text', 'register'],
                  properties: {
                    explanationLanguage: {
                      type: 'string',
                      enum: LANGUAGE_CODES,
                    },
                    text: { type: 'string' },
                    register: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  private buildQuizMaterialSchema() {
    return {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['term', 'antonyms', 'quizScenarios'],
            properties: {
              term: { type: 'string' },
              antonyms: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['value'],
                  properties: { value: { type: 'string' } },
                },
              },
              quizScenarios: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'language',
                    'situation',
                    'question',
                    'correct',
                    'distractors',
                  ],
                  properties: {
                    language: { type: 'string', enum: LANGUAGE_CODES },
                    situation: { type: 'string' },
                    question: { type: 'string' },
                    correct: { type: 'string' },
                    distractors: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Wraps the API call so a spent quota becomes a domain error.
   *
   * The OpenAI SDK's own error type stays inside this provider — the
   * queue that decides whether to retry has no business importing it,
   * and would otherwise match on a vendor's error code.
   */
  private async createResponse(
    body: OpenAI.Responses.ResponseCreateParamsNonStreaming,
  ): Promise<OpenAI.Responses.Response> {
    try {
      return await this.client.responses.create(body);
    } catch (error) {
      if (error instanceof OpenAI.APIError && isSpentQuota(error)) {
        throw new VocabularyGenerationQuotaExceededError(error);
      }
      throw error;
    }
  }

  private buildSystemPrompt(): string {
    return [
      'You are a lexicographer building the vocabulary a curious adult meets one word a day.',
      'You choose words a native speaker would be pleased a learner knew, and you explain them the way a well-read friend would.',
      'Return only valid JSON matching the provided schema.',
      'No markdown, no commentary, no text around the JSON.',
    ].join(' ');
  }

  /**
   * Words a language model reaches for whenever "sophisticated" or
   * "nuanced" vocabulary is requested.
   *
   * Naming them is the only instruction that closes the default pool: an
   * abstract "avoid clichés" makes the model think of clichés, while a
   * list is something it can actually check itself against.
   */
  private static readonly OVERUSED_TERMS = [
    'serendipity',
    'ephemeral',
    'liminal',
    'petrichor',
    'sonder',
    'mellifluous',
    'quintessential',
    'ubiquitous',
    'resilience',
    'nostalgia',
    'wanderlust',
    'eloquent',
    'ambivalent',
    'juxtaposition',
    'ineffable',
    'limerence',
  ];

  private buildUserPrompt(params: {
    count: number;
    targetLanguage: string;
    explanationLanguage: string;
    allowedThemeSlugs: string[];
    excludedTerms: string[];
    underCoveredThemes: string[];
    brief: ExplorationBrief;
  }): string {
    const {
      count,
      targetLanguage,
      explanationLanguage,
      allowedThemeSlugs,
      excludedTerms,
      underCoveredThemes,
      brief,
    } = params;
    const bilingual = explanationLanguage !== targetLanguage;

    // Sections and newlines rather than one joined paragraph: a wall of
    // twenty-five sentences reads as noise to the model and is unmaintainable
    // for us.
    return [
      '# Task',
      `Produce ${count} vocabulary entries in ${targetLanguage}, explained in ${explanationLanguage}.`,
      '',
      "# This batch's territory",
      `Semantic field: ${brief.semanticField}.`,
      `Required mix: ${brief.beginner} BEGINNER, ${brief.intermediate} INTERMEDIATE, ${brief.advanced} ADVANCED.`,
      `At least ${brief.minExpressions} entries must have partOfSpeech EXPRESSION — idioms, set phrases and collocations a learner cannot assemble from a dictionary.`,
      ...(underCoveredThemes.length
        ? [
            `The corpus is thin on these themes: ${underCoveredThemes.join(', ')}. Where the semantic field allows it, choose words that genuinely belong to them — but never tag a word with a theme it does not fit.`,
          ]
        : []),
      '',
      '# The bar',
      // One testable question beats ten adjectives. Both halves matter:
      // the obvious word fails the second, dictionary-only jargon the first.
      'Every entry must pass this test: an educated native speaker would use it this month, and a fluent learner would be visibly impressed that you knew it.',
      'BEGINNER means immediately understandable and reusable — not childish. A beginner word still has to pass the test.',
      '',
      '# Already covered — do not repeat these, or their close variants',
      excludedTerms.length ? excludedTerms.join(', ') : '(the corpus is empty)',
      '',
      '# Banned regardless',
      OpenAiVocabularyGenerationProvider.OVERUSED_TERMS.join(', ') + '.',
      '',
      ...DEFINITION_RULES,
      '',
      '# Examples',
      'Each example must read as something a person actually said or wrote — a message, an argument, a moment of work or of intimacy.',
      'It must contain the term verbatim.',
      'A sentence that exists only to demonstrate the word is a failure.',
      'Give at least one per entry.',
      '',
      '# Synonyms',
      'Only words a native speaker would accept as a substitute in the example sentence you just wrote. At least one per entry.',
      '',
      ...QUIZ_MATERIAL_RULES,
      '',
      '# Where each thing goes',
      // A reasoning model given only quality criteria merges everything
      // into the first field that will hold it: the whole batch came
      // back with the example and its translation pasted inside
      // `definitions[].text`, and `examples` empty.
      '`definitions[].text` holds the definition and nothing else — no example sentence, no translation, no "Example:" or "Traduction:" line inside it.',
      'The sentence goes in `examples[].sentence`, its translation in `examples[].translation`.',
      'Nuance belongs in the definition itself, phrased as part of it, not appended as a "Nuance:" note.',
      '',
      '# Structure',
      `1 to 3 themeSlugs, taken only from: ${allowedThemeSlugs.join(', ')}. Never invent one.`,
      `At least one definition in ${targetLanguage}.`,
      bilingual
        ? `Plus at least one definition in ${explanationLanguage}, and a fluent translation for every example.`
        : 'Translations may be null.',
      'audioUrl and provider are null; give the phonetic transcription.',
    ].join('\n');
  }

  private buildSchema(allowedThemeSlugs: string[]) {
    return {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'term',
              'targetLanguage',
              'difficulty',
              'partOfSpeech',
              'definitions',
              'examples',
              'pronunciations',
              'synonyms',
              'antonyms',
              'quizScenarios',
              'themeSlugs',
            ],
            properties: {
              term: { type: 'string' },
              targetLanguage: {
                type: 'string',
                enum: LANGUAGE_CODES,
              },
              difficulty: {
                type: 'string',
                enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
              },
              partOfSpeech: {
                type: 'string',
                enum: [
                  'NOUN',
                  'VERB',
                  'ADJECTIVE',
                  'ADVERB',
                  'EXPRESSION',
                  'OTHER',
                ],
              },
              definitions: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['explanationLanguage', 'text', 'register'],
                  properties: {
                    explanationLanguage: {
                      type: 'string',
                      enum: LANGUAGE_CODES,
                    },
                    text: { type: 'string' },
                    register: { type: ['string', 'null'] },
                  },
                },
              },
              examples: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['sentence', 'translation', 'translationLanguage'],
                  properties: {
                    sentence: { type: 'string' },
                    translation: { type: ['string', 'null'] },
                    translationLanguage: {
                      type: ['string', 'null'],
                      enum: [...LANGUAGE_CODES, null],
                    },
                  },
                },
              },
              pronunciations: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['phonetic', 'audioUrl', 'provider'],
                  properties: {
                    phonetic: { type: ['string', 'null'] },
                    audioUrl: { type: ['string', 'null'] },
                    provider: { type: ['string', 'null'] },
                  },
                },
              },
              synonyms: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['value'],
                  properties: {
                    value: { type: 'string' },
                  },
                },
              },
              antonyms: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['value'],
                  properties: {
                    value: { type: 'string' },
                  },
                },
              },
              quizScenarios: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'language',
                    'situation',
                    'question',
                    'correct',
                    'distractors',
                  ],
                  properties: {
                    language: { type: 'string', enum: LANGUAGE_CODES },
                    situation: { type: 'string' },
                    question: { type: 'string' },
                    correct: { type: 'string' },
                    distractors: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
              themeSlugs: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: allowedThemeSlugs,
                },
              },
            },
          },
        },
      },
    };
  }
}
