import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GenerateVocabularyBatchRequestDto } from '../../application/dto/generate-vocabulary-batch.request.dto';
import type { GenerateVocabularyBatchResult } from '../../application/commands/generate-vocabulary-batch.command';
import { GenerateVocabularyBatchCommand } from '../../application/commands/generate-vocabulary-batch.command';
import { ApiSuccessResponse } from '../../../waitlist/presentation/http/api-success-response';

@Controller('vocabulary/ingestion')
export class VocabularyIngestionController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('generate-batch')
  async generateBatch(@Body() body: GenerateVocabularyBatchRequestDto) {
    const result: GenerateVocabularyBatchResult = await this.commandBus.execute(
      new GenerateVocabularyBatchCommand(
        body.targetLanguage,
        body.explanationLanguage,
        body.count,
        body.theme,
      ),
    );

    return ApiSuccessResponse.of(result);
  }
}
