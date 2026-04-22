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

    const response = await this.client.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You generate high-quality structured vocabulary learning data. Return only valid JSON matching the provided schema.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                `Generate ${input.count} distinct, useful vocabulary entries.`,
                `Target language: ${input.targetLanguage}.`,
                `Explanation language: ${explanationLanguage}.`,
                input.theme
                  ? `Theme: ${input.theme}.`
                  : 'Theme: general useful vocabulary.',
                'Avoid duplicates, trivial variants, proper nouns, and obscure archaic words.',
                'Each item must include at least one definition in the target language.',
                'Each item must include at least one natural example sentence in the target language.',
                'If explanationLanguage is different from targetLanguage, include at least one additional definition in the explanation language.',
                'Example sentences must always be written in the target language.',
                'If explanationLanguage is different from targetLanguage, example translations should be written in the explanation language.',
                'If explanationLanguage is the same as targetLanguage, translation may be null.',
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
