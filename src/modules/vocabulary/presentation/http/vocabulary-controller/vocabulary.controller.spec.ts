import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { VocabularyController } from './vocabulary.controller';

describe('VocabularyController', () => {
  let controller: VocabularyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VocabularyController],
      providers: [
        { provide: CommandBus, useValue: { execute: jest.fn() } },
        { provide: QueryBus, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get<VocabularyController>(VocabularyController);
  });

  it('is constructed with its buses', () => {
    expect(controller).toBeDefined();
  });
});
