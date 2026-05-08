import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { VocabularyGenerationProvider } from '../../../modules/vocabulary-ingestion/domain/providers/vocabulary-generation.provider';
import { VOCABULARY_GENERATION_PROVIDER } from '../../../modules/vocabulary-ingestion/domain/providers/vocabulary-generation.provider';
import { CommandBus } from '@nestjs/cqrs';
import { GenerateVocabularyBatchRequestDto } from '../../../modules/vocabulary-ingestion/application/dto/generate-vocabulary-batch.request.dto';
import { CreateVocabularyWordCommand } from '../../../modules/vocabulary/application/commands/create-vocabulary-word.command';
import {
  GENERATE_VOCABULARY_BATCH_JOB,
  VOCABULARY_QUEUE,
} from '../../../modules/vocabulary-ingestion/infrastructure/queue/vocabulary-queue.constants';
import type { ThemeRepository } from '../../../modules/vocabulary/domain/repositories/theme.repository';
import { THEME_REPOSITORY } from '../../../modules/vocabulary/domain/repositories/theme.repository';

@Processor(VOCABULARY_QUEUE)
export class GenerateVocabularyBatchProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerateVocabularyBatchProcessor.name);

  constructor(
    @Inject(VOCABULARY_GENERATION_PROVIDER)
    private readonly provider: VocabularyGenerationProvider,
    private readonly commandBus: CommandBus,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
  ) {
    super();
  }

  async findThemeSlugs(): Promise<string[]> {
    return await this.themeRepository
      .list()
      .then((themes) => themes.map((theme) => theme.slug));
  }

  async process(job: Job<any>) {
    console.log(job.name);
    if (job.name !== GENERATE_VOCABULARY_BATCH_JOB) return;

    this.logger.log(`Processing job ${job.id}`);

    const { targetLanguage, explanationLanguage, count } =
      job.data as GenerateVocabularyBatchRequestDto;

    const allowedThemeSlugs = await this.findThemeSlugs();

    const result = await this.provider.generateVocabularyBatch({
      targetLanguage,
      explanationLanguage,
      count,
      allowedThemeSlugs,
    });

    console.log('Vocabulary processor result: ', result.items);

    for (const item of result.items) {
      try {
        await this.commandBus.execute(
          new CreateVocabularyWordCommand({
            term: item.term,
            targetLanguage: item.targetLanguage,
            difficulty: item.difficulty,
            partOfSpeech: item.partOfSpeech,
            definitions: item.definitions,
            examples: item.examples,
            pronunciations: item.pronunciations,
            synonyms: item.synonyms,
            themeSlugs: item.themeSlugs,
          }),
        );
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
        if (error.message && error.message?.includes('already exists')) {
          this.logger.warn(`Duplicate: ${item.term}`);
          continue;
        }

        this.logger.error(`Failed for ${item.term}`, error);
      }
    }
  }
}
