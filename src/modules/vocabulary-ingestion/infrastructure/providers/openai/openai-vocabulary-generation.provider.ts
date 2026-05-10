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
} from '../../../domain/providers/vocabulary-generation.provider';

const LANGUAGE_CODES = ['EN', 'FR', 'ES'] as const;

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

    const count = Math.min(input.count, 30);

    this.logger.debug({
      count,
      targetLanguage: input.targetLanguage,
      explanationLanguage,
      allowedThemeSlugs: input.allowedThemeSlugs,
    });

    const response = await this.client.responses.create({
      model: process.env.OPENAI_VOCABULARY_MODEL ?? 'gpt-4.1-mini',
      temperature: 0.9,
      max_output_tokens: 12000,
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

  private buildSystemPrompt(): string {
    return [
      'You are an elite multilingual lexicographer and language-learning content designer.',
      'You generate premium structured vocabulary learning data.',
      'Return only valid JSON matching the provided schema.',
      'Do not include markdown, explanations, comments, or surrounding text.',
    ].join(' ');
  }

  private buildUserPrompt(params: {
    count: number;
    targetLanguage: string;
    explanationLanguage: string;
    allowedThemeSlugs: string[];
  }): string {
    return [
      `Generate exactly ${params.count} distinct vocabulary entries.`,
      `Target language: ${params.targetLanguage}.`,
      `Explanation language: ${params.explanationLanguage}.`,
      `Allowed theme slugs: ${params.allowedThemeSlugs.join(', ')}.`,

      'The vocabulary must feel sophisticated, culturally relevant, emotionally nuanced, and genuinely useful in real-world communication.',
      'Do not generate simplistic textbook vocabulary.',
      'Do not generate children-level vocabulary.',
      'Do not generate ultra-obscure dictionary-only jargon.',
      'Do not generate semantically repetitive words within the same batch.',
      'Do not generate near-synonyms unless the nuance is substantially different.',

      'Prefer vocabulary that educated native speakers encounter in conversations, books, modern culture, media, psychology, philosophy, business, technology, intellectual discussions, professional environments, and emotionally meaningful situations.',

      'BEGINNER words must still feel useful, modern, expressive, culturally relevant, and intellectually meaningful.',
      'BEGINNER means easy to understand and reusable, not primitive.',

      'Definitions must be concise, natural, precise, and insightful.',
      'Definitions should clarify nuance, tone, emotional implication, or contextual usage when relevant.',
      'Avoid mechanical dictionary phrasing.',

      'Example sentences must feel realistic, emotionally believable, and naturally spoken or written by native speakers.',
      'Avoid sterile textbook-style examples.',
      'Examples should reflect relationships, work, ambition, emotions, social dynamics, modern life, culture, technology, personal growth, or human behavior.',

      'Synonyms must be semantically close and preserve nuance where possible.',
      'Avoid weak, generic, or loosely related synonyms.',

      'Each item must include one to three themeSlugs.',
      'themeSlugs must only contain values from the allowed theme slugs list.',
      'Do not invent new theme slugs.',

      'Each item must include at least one definition in the target language.',
      'If explanationLanguage differs from targetLanguage, include at least one additional definition in the explanation language.',

      'Each item must include at least one natural example sentence in the target language.',
      'If explanationLanguage differs from targetLanguage, example translations must be fluent and natural.',
      'If explanationLanguage equals targetLanguage, translation may be null.',

      'Each item must include at least one synonym in the target language.',
      'Pronunciations may use null for audioUrl and provider when unavailable.',
    ].join(' ');
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
