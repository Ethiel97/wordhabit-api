import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  GeneratedVocabularyBatch,
  GenerateVocabularyBatchInput,
  VocabularyGenerationProvider,
} from '../../../domain/providers/vocabulary-generation.provider';

@Injectable()
export class OpenAiVocabularyGenerationProvider implements VocabularyGenerationProvider {
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async generateVocabularyBatch(
    input: GenerateVocabularyBatchInput,
  ): Promise<GeneratedVocabularyBatch> {
    const explanationLanguage = input.explanationLanguage ?? 'EN';

    console.log('allowedThemeSlugs:', input?.allowedThemeSlugs);

    const response = await this.client.responses.create({
      model: 'gpt-4.1-mini',
      temperature: 1.1,
      input: [
        {
          role: 'system',
          content:
            'You generate high-quality, top-notch structured vocabulary learning data. Return only valid JSON matching the provided schema.',
        },
        {
          role: 'user',

          content: [
            {
              type: 'input_text',
              text: [
                `Generate ${input.count} distinct, high-quality vocabulary entries.`,
                `Target language: ${input.targetLanguage}.`,
                `Allowed themes: ${input?.allowedThemeSlugs?.join(', ')}`,

                'Generate vocabulary that feels intellectually valuable, expressive, modern, and culturally relevant.',
                'Avoid generic textbook vocabulary and oversimplified beginner words.',
                'Even BEGINNER words should feel useful, refined, nuanced, and memorable.',
                'Prioritize words commonly used by educated native speakers in real conversations, media, work, culture, psychology, technology, society, and modern life.',

                'Do not generate trivial words such as "good", "bad", "happy", "big", "small", "nice", "book", "house", unless absolutely necessary.',
                'Prefer vocabulary with conceptual richness, emotional nuance, practical relevance, or expressive power.',

                'Include a balanced mix of:',
                '- emotionally expressive vocabulary',
                '- professional vocabulary',
                '- social and conversational vocabulary',
                '- abstract and conceptual vocabulary',
                '- culturally relevant modern vocabulary',
                '- intellectually useful everyday vocabulary',

                'Avoid obscure archaic words, slang with short lifespan, and highly domain-specific jargon.',

                'Each item must include themeSlugs.',
                'themeSlugs must only contain values from the allowed theme slugs list.',
                'Each item should include one to three themeSlugs.',
                'If a term could fit multiple themes, choose the most relevant ones.',

                `Explanation language: ${explanationLanguage}.`,

                'Definitions must be precise, natural, concise, and written like a high-quality dictionary for language learners.',
                'Definitions should explain nuance and usage naturally, not mechanically.',

                'Example sentences must sound authentic and natural.',
                'Avoid robotic educational examples.',
                'Examples should resemble real native usage from conversations, work, media, books, or daily life.',

                'Each item must include at least one definition in the target language.',
                'Each item must include at least one natural example sentence in the target language.',
                'Each item must include at least one synonym in the target language.',

                'If explanationLanguage differs from targetLanguage, include at least one additional translated definition.',
                'Example translations should be fluent and natural.',

                'Pronunciations may omit audioUrl if unavailable.',
              ].join(' '),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'generated_vocabulary_batch',
          strict: true,
          schema: {
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
                      enum: ['EN', 'FR', 'ES', 'DE', 'IT', 'PT'],
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
                            enum: ['EN', 'FR', 'ES', 'DE', 'IT', 'PT'],
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
                        required: [
                          'sentence',
                          'translation',
                          'translationLanguage',
                        ],
                        properties: {
                          sentence: { type: 'string' },
                          translation: { type: ['string', 'null'] },
                          translationLanguage: {
                            type: ['string', 'null'],
                            enum: ['EN', 'FR', 'ES', 'DE', 'IT', 'PT'],
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
                        enum: input.allowedThemeSlugs,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const jsonText = response.output_text;

    if (!jsonText) {
      throw new InternalServerErrorException(
        'OpenAI returned an empty structured response.',
      );
    }

    return JSON.parse(jsonText) as GeneratedVocabularyBatch;
  }
}
