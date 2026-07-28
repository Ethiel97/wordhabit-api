import { Test, TestingModule } from '@nestjs/testing';
import { LearningController } from './learning.controller';
import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { GetRandomWordQuery } from '../../application/queries/get-random-word.query';

describe('LearningController', () => {
  let controller: LearningController;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [LearningController],
    }).compile();

    controller = module.get<LearningController>(LearningController);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRandomWord', () => {
    it('should execute GetRandomWordQuery and return ApiSuccessResponse', async () => {
      const mockRandomWord = {
        id: 'test-id-123',
        term: 'serendipity',
        targetLanguage: 'EN',
        difficulty: 'ADVANCED',
        partOfSpeech: 'NOUN',
        definitions: [
          {
            id: 'def-1',
            text: 'The occurrence of events by chance in a happy or beneficial way',
            explanationLanguage: 'EN',
            register: null,
          },
        ],
        examples: [
          {
            id: 'ex-1',
            sentence:
              'It was pure serendipity that I met my best friend on a delayed flight.',
            translation: null,
            translationLanguage: null,
          },
        ],
        pronunciations: [
          {
            id: 'pron-1',
            phonetic: '/ˌserənˈdɪpɪti/',
            audioUrl: 'https://example.com/audio.mp3',
            provider: 'example',
          },
        ],
        synonyms: [
          {
            id: 'syn-1',
            value: 'luck',
          },
        ],
      };

      jest.spyOn(queryBus, 'execute').mockResolvedValueOnce(mockRandomWord);

      // The route now takes a filter DTO; an empty one is the welcome
      // screen's case, before any language or level has been chosen.
      const result = await controller.getRandomWord({});

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(GetRandomWordQuery),
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRandomWord);
    });
  });
});
