import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import type {
  GeneratedVocabularyBatch,
  GenerateVocabularyBatchInput,
  VocabularyGenerationProvider,
} from '../../../domain/providers/vocabulary-generation.provider';
import { LanguageCode } from '../../../../../../generated/prisma/enums';

@Injectable()
export class GeminiVocabularyGenerationProvider implements VocabularyGenerationProvider {
  private readonly client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  async generateBatch(
    input: GenerateVocabularyBatchInput,
  ): Promise<GeneratedVocabularyBatch> {
    const explanationLanguage = input.explanationLanguage ?? LanguageCode.EN;

    const prompt = [
      `Generate ${input.count} distinct, useful vocabulary entries.`,
      `Target language: ${input.targetLanguage}.`,
      `Explanation language: ${explanationLanguage}.`,
      input.theme
        ? `Theme: ${input.theme}.`
        : 'Theme: general useful vocabulary.',
      'Return practical, high-quality vocabulary for learning.',
      'Avoid duplicates, trivial variants, proper nouns, slang unless broadly useful, and obscure archaic words.',
      'Each item must include at least one definition.',
      'Examples should feel natural and pedagogical.',
      // 'Pronunciations may omit audioUrl if unavailable.',
    ].join(' ');

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          additionalProperties: false,
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              minItems: 1,
              maxItems: input.count,
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
                  // 'pronunciations',
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
                    minItems: 1,
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['explanationLanguage', 'text'],
                      properties: {
                        explanationLanguage: {
                          type: 'string',
                          enum: ['EN', 'FR', 'ES', 'DE', 'IT', 'PT'],
                        },
                        text: { type: 'string' },
                        register: { type: 'string' },
                      },
                    },
                  },
                  examples: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['sentence'],
                      properties: {
                        sentence: { type: 'string' },
                        translation: { type: 'string' },
                        translationLanguage: {
                          type: 'string',
                          enum: ['EN', 'FR', 'ES', 'DE', 'IT', 'PT'],
                        },
                      },
                    },
                  },
                  /*pronunciations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        phonetic: { type: 'string' },
                        audioUrl: { type: 'string' },
                        provider: { type: 'string' },
                      },
                    },
                  },*/
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
    });

    const jsonText = response.text;

    if (!jsonText) {
      throw new InternalServerErrorException(
        'Gemini returned an empty structured response.',
      );
    }

    return JSON.parse(jsonText) as GeneratedVocabularyBatch;
  }
}
